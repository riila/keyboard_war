import { getSupabase } from './supabase';
import type { Lang } from './words';

export interface PlayerLine {
  nick: string;
  speed: number;
  accuracy: number;
  combo: number;
  hp: number;
}

export interface MatchRecord {
  mode: 'random' | 'friend';
  lang: Lang;
  rounds: number;
  endReason: 'ko' | 'forfeit';
  me: PlayerLine;
  them: PlayerLine;
  iWon: boolean;
}

/**
 * Both players report the same finished match, so only the winner writes it.
 * That keeps one row per match without needing a server to arbitrate.
 * Bot matches never end, so nothing from them reaches here.
 */
export async function saveMatch(r: MatchRecord): Promise<boolean> {
  if (!r.iWon) return true;
  const client = getSupabase();
  if (!client) return false;

  const clamp = (n: number) => Math.max(-32000, Math.min(32000, Math.round(n)));
  const { error } = await client.from('guest_matches').insert({
    mode: r.mode,
    lang: r.lang,
    p1_nick: r.me.nick.slice(0, 16) || '-',
    p2_nick: r.them.nick.slice(0, 16) || '-',
    winner: 'p1',
    end_reason: r.endReason,
    rounds: Math.min(200, Math.max(0, r.rounds)),
    p1_speed: clamp(r.me.speed), p1_accuracy: clamp(r.me.accuracy),
    p1_combo: clamp(r.me.combo), p1_hp: clamp(r.me.hp),
    p2_speed: clamp(r.them.speed), p2_accuracy: clamp(r.them.accuracy),
    p2_combo: clamp(r.them.combo), p2_hp: clamp(r.them.hp),
  });
  return !error;
}

export interface RecentMatch {
  p1_nick: string;
  p2_nick: string;
  end_reason: string;
  rounds: number;
  p1_speed: number | null;
  created_at: string;
}

export async function recentMatches(limit = 8): Promise<RecentMatch[]> {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client
    .from('guest_matches')
    .select('p1_nick,p2_nick,end_reason,rounds,p1_speed,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as RecentMatch[];
}
