import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

/**
 * Matchmaking over Supabase Realtime.
 *
 * Everyone who opens the game joins one presence channel — the hall. Presence
 * answers both questions the prototype needed a localStorage heartbeat for:
 * who is waiting right now, and is this friend code online. Presence also
 * reports a peer leaving, so a closed tab is detected by the server rather
 * than by watching a timestamp go stale.
 *
 * Each pairing then opens its own broadcast channel for the fight itself.
 */

export interface Member {
  id: string;
  nick: string;
  code: string;
  seeking: boolean;
  at: number;
}

export type InviteKind = 'friend' | 'rematch';
export type Pairing = { peer: Member; matchId: string; isHost: boolean; kind: 'random' | 'friend' | 'rematch' };

const HALL = 'kw-hall-v1';

function randomCode(): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

/** Stable for this tab, so two tabs of one browser are two players. */
export function myCode(): string {
  try {
    const saved = sessionStorage.getItem('kw_code');
    if (saved && saved.length === 6) return saved;
    const fresh = randomCode();
    sessionStorage.setItem('kw_code', fresh);
    return fresh;
  } catch {
    return randomCode();
  }
}

export class Hall {
  private client: SupabaseClient | null;
  private ch: RealtimeChannel | null = null;
  private me: Member;
  private paired = false;
  members: Member[] = [];

  onMembers: ((m: Member[]) => void) | null = null;
  onPair: ((p: Pairing) => void) | null = null;
  onInvite: ((from: Member, matchId: string, kind: InviteKind) => void) | null = null;
  private avoidId: string | null = null;
  private avoidUntil = 0;
  onStatus: ((s: 'connecting' | 'online' | 'offline') => void) | null = null;

  constructor(nick: string, code: string) {
    this.client = getSupabase();
    this.me = { id: crypto.randomUUID(), nick, code, seeking: false, at: Date.now() };
  }

  get id() { return this.me.id; }
  get online() { return Boolean(this.ch); }

  async connect(): Promise<boolean> {
    if (this.ch) return true;
    if (!this.client) { this.onStatus?.('offline'); return false; }
    this.onStatus?.('connecting');

    const ch = this.client.channel(HALL, {
      config: { presence: { key: this.me.id }, broadcast: { self: false } },
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<Member>();
      const list: Member[] = [];
      for (const key of Object.keys(state)) {
        const entry = state[key][0];
        if (entry && entry.id) list.push(entry);
      }
      this.members = list;
      this.onMembers?.(list);
      this.tryPair();
    });

    ch.on('broadcast', { event: 'pair' }, ({ payload }) => {
      const p = payload as { toId: string; matchId: string; host: Member };
      if (p.toId !== this.me.id || this.paired || !this.me.seeking) return;
      this.paired = true;
      this.onPair?.({ peer: p.host, matchId: p.matchId, isHost: false, kind: 'random' });
    });

    ch.on('broadcast', { event: 'invite' }, ({ payload }) => {
      const p = payload as { toId: string; matchId: string; host: Member; kind: InviteKind };
      const kind = p.kind ?? 'friend';
      if (p.toId !== this.me.id || this.paired) return;
      // a rematch offer is only welcome from someone who asked for one
      if (kind === 'rematch' && !this.me.seeking) return;
      this.paired = true;
      this.onInvite?.(p.host, p.matchId, kind);
    });

    const ok = await new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (v: boolean) => { if (!settled) { settled = true; resolve(v); } };
      setTimeout(() => done(false), 8000);
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track(this.me);
          done(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          done(false);
        }
      });
    });

    if (!ok) {
      try { await ch.unsubscribe(); } catch {}
      this.onStatus?.('offline');
      return false;
    }
    this.ch = ch;
    this.onStatus?.('online');
    return true;
  }

  async setNick(nick: string) {
    this.me = { ...this.me, nick, at: Date.now() };
    if (this.ch) await this.ch.track(this.me);
  }

  /**
   * `avoid` holds one id back for a moment. A rematch broadcasts first so a
   * genuinely new waiting player wins the race; the previous opponent only
   * becomes eligible once that grace period lapses.
   */
  async setSeeking(v: boolean, avoid?: { id: string; ms: number }) {
    this.paired = false;
    this.avoidId = v && avoid ? avoid.id : null;
    this.avoidUntil = v && avoid ? Date.now() + avoid.ms : 0;
    this.me = { ...this.me, seeking: v, at: Date.now() };
    if (this.ch) await this.ch.track(this.me);
    if (v) this.tryPair();
  }

  /** The lower id claims the pair, so two seekers can never both wait. */
  private tryPair() {
    if (!this.ch || this.paired || !this.me.seeking) return;
    if (this.avoidId && Date.now() < this.avoidUntil) {
      const wait = this.avoidUntil - Date.now();
      setTimeout(() => this.tryPair(), wait + 30);
    }
    const holding = this.avoidId && Date.now() < this.avoidUntil ? this.avoidId : null;
    const others = this.members
      .filter((m) => m.id !== this.me.id && m.seeking && m.id !== holding)
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    if (!others.length) return;

    const peer = others[0];
    if (this.me.id >= peer.id) return; // they will claim us
    const matchId = `${this.me.id}_${peer.id}`;
    this.paired = true;
    this.ch.send({ type: 'broadcast', event: 'pair', payload: { toId: peer.id, matchId, host: this.me } });
    this.onPair?.({ peer, matchId, isHost: true, kind: 'random' });
  }

  findByCode(code: string): Member | null {
    const up = code.trim().toUpperCase();
    return this.members.find((m) => m.id !== this.me.id && m.code === up) ?? null;
  }

  /** Targeted invite — a friend code, or a rematch offer to the last opponent. */
  invite(peer: Member, kind: InviteKind): Pairing {
    const matchId = `${this.me.id}_${peer.id}_${kind[0]}${Date.now().toString(36)}`;
    this.paired = true;
    this.ch?.send({
      type: 'broadcast', event: 'invite',
      payload: { toId: peer.id, matchId, host: this.me, kind },
    });
    return { peer, matchId, isHost: true, kind };
  }

  inviteByCode(code: string): Pairing | null {
    if (!this.ch) return null;
    const peer = this.findByCode(code);
    if (!peer) return null;
    return this.invite(peer, 'friend');
  }

  memberById(id: string): Member | null {
    return this.members.find((m) => m.id === id) ?? null;
  }

  releasePair() { this.paired = false; }

  async disconnect() {
    if (!this.ch) return;
    try { await this.ch.untrack(); } catch {}
    try { await this.ch.unsubscribe(); } catch {}
    this.ch = null;
  }
}

/* ------------------------------------------------------------------ */

/**
 * One list, so a new event cannot be typed but left unsubscribed — which is
 * exactly how 'rdy' arrived at the channel with nothing listening for it.
 */
export const MATCH_EVENTS = ['round', 'prog', 'done', 'res', 'start', 'bye', 'rdy'] as const;
export type MatchEvent = (typeof MATCH_EVENTS)[number];

/** One channel per pairing: the fight's own wire. */
export class MatchLink {
  private ch: RealtimeChannel | null = null;
  private live = false;
  private outbox: { event: MatchEvent; payload: Record<string, unknown> }[] = [];
  private handlers = new Map<MatchEvent, (p: any) => void>();
  private leftCb: (() => void) | null = null;
  private selfId: string;
  private peerId: string;

  constructor(matchId: string, selfId: string, peerId: string) {
    this.selfId = selfId;
    this.peerId = peerId;
    const client = getSupabase();
    if (!client) return;

    const ch = client.channel(`kw-match-${matchId}`, {
      config: { presence: { key: selfId }, broadcast: { self: false } },
    });

    for (const ev of MATCH_EVENTS) {
      ch.on('broadcast', { event: ev }, ({ payload }) => this.handlers.get(ev)?.(payload));
    }

    // the server tells us when they go, so there is no heartbeat to watch
    ch.on('presence', { event: 'leave' }, ({ key }) => {
      if (key === this.peerId) this.leftCb?.();
    });

    ch.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      ch.track({ id: selfId, at: Date.now() });
      this.live = true;
      for (const m of this.outbox.splice(0)) this.raw(m.event, m.payload);
    });
    this.ch = ch;
  }

  on(event: MatchEvent, cb: (payload: any) => void) { this.handlers.set(event, cb); }
  onPeerLeft(cb: () => void) { this.leftCb = cb; }

  /** Sends made before the channel is up are held, not dropped. */
  send(event: MatchEvent, payload: Record<string, unknown> = {}) {
    if (!this.ch) return;
    if (!this.live) { this.outbox.push({ event, payload }); return; }
    this.raw(event, payload);
  }

  private raw(event: MatchEvent, payload: Record<string, unknown>) {
    this.ch?.send({ type: 'broadcast', event, payload: { ...payload, from: this.selfId } });
  }

  async close() {
    if (!this.ch) return;
    const ch = this.ch;
    this.ch = null;
    this.live = false;
    this.outbox = [];
    this.handlers.clear();
    this.leftCb = null;
    try { ch.send({ type: 'broadcast', event: 'bye', payload: { from: this.selfId } }); } catch {}
    try { await ch.untrack(); } catch {}
    try { await ch.unsubscribe(); } catch {}
  }
}
