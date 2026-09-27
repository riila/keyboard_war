'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Backdrop, { Crest } from '@/components/Backdrop';
import Battle from '@/components/Battle';
import { Hall, MatchLink, myCode, type Member, type Pairing } from '@/lib/net';
import { saveMatch, recentMatches, type RecentMatch } from '@/lib/records';
import { supabaseConfigured } from '@/lib/supabase';
import { T } from '@/lib/i18n';
import type { Lang } from '@/lib/words';
import { ENERGY_GOAL, SEEK_SECONDS, HANDOFF_SECONDS, START_LV } from '@/lib/rules';
import type { FinishResult } from '@/lib/engine';

type View =
  | 'menu' | 'ranked' | 'story' | 'versus'
  | 'search' | 'handoff' | 'friend' | 'room'
  | 'battle' | 'result';

type MatchKind = 'random' | 'friend';

const REMATCH_GRACE = 1200;

export default function Page() {
  const [lang, setLang] = useState<Lang>('ko');
  const [nick, setNick] = useState('');
  const [view, setView] = useState<View>('menu');
  const [hallStatus, setHallStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [waiting, setWaiting] = useState(0);

  const [code] = useState(() => (typeof window === 'undefined' ? '------' : myCode()));
  const [friendCode, setFriendCode] = useState('');
  const [netMsg, setNetMsg] = useState<{ text: string; tone?: 'ok' | 'err' }>({ text: '' });

  const [seekLeft, setSeekLeft] = useState(SEEK_SECONDS);
  const [handoffLeft, setHandoffLeft] = useState(HANDOFF_SECONDS);

  const [battle, setBattle] = useState<{
    mode: 'bot' | 'pvp'; isHost: boolean; foeNick: string; key: string; botLevel: number;
  } | null>(null);
  const [result, setResult] = useState<FinishResult | null>(null);
  const [saveNote, setSaveNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const [recent, setRecent] = useState<RecentMatch[]>([]);

  const [energy, setEnergy] = useState(0);
  const [roomLead, setRoomLead] = useState('');

  const hall = useRef<Hall | null>(null);
  const link = useRef<MatchLink | null>(null);
  const pairing = useRef<Pairing | null>(null);
  const lastPeer = useRef<Member | null>(null);
  const matchKind = useRef<MatchKind>('random');
  const botLv = useRef(START_LV);
  const timers = useRef<number[]>([]);
  const viewRef = useRef<View>('menu');
  viewRef.current = view;

  const d = T[lang];

  /* ---------------- timers ---------------- */
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  /* ---------------- boot ---------------- */
  useEffect(() => {
    try {
      const e = Number(localStorage.getItem('kw_energy') ?? 0);
      if (Number.isFinite(e)) setEnergy(e);
      const n = localStorage.getItem('kw_nick');
      if (n) setNick(n);
    } catch {}
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) { setHallStatus('offline'); return; }
    const h = new Hall(nick || 'Wanderer', code);
    hall.current = h;
    h.onStatus = setHallStatus;
    h.onMembers = (m) => setWaiting(m.filter((x) => x.seeking && x.id !== h.id).length);
    h.onPair = (p) => enterHandoff(p);
    h.onInvite = (from, matchId, kind) => {
      if (kind === 'rematch') {
        enterHandoff({ peer: from, matchId, isHost: false, kind: 'rematch' });
      } else {
        pairing.current = { peer: from, matchId, isHost: false, kind: 'friend' };
        matchKind.current = 'friend';
        openLink(matchId, from);
        setRoomLead(d.roomGuest);
        setView('room');
      }
    };
    h.connect();
    return () => { h.disconnect(); hall.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { hall.current?.setNick(nick || 'Wanderer'); }, [nick]);

  useEffect(() => {
    try { if (nick) localStorage.setItem('kw_nick', nick); } catch {}
  }, [nick]);

  /* ---------------- link ---------------- */
  const closeLink = useCallback(() => {
    link.current?.close();
    link.current = null;
  }, []);

  const openLink = useCallback((matchId: string, peer: Member) => {
    closeLink();
    const h = hall.current;
    if (!h) return null;
    const l = new MatchLink(matchId, h.id, peer.id);
    link.current = l;
    return l;
  }, [closeLink]);

  /* ---------------- flow ---------------- */

  const toMenu = useCallback(() => {
    clearTimers();
    closeLink();
    pairing.current = null;
    hall.current?.setSeeking(false);
    hall.current?.releasePair();
    setBattle(null);
    setNetMsg({ text: '' });
    setView('menu');
  }, [clearTimers, closeLink]);

  const startBot = useCallback((keepSeeking: boolean) => {
    clearTimers();
    closeLink();
    pairing.current = null;
    setBattle({
      mode: 'bot', isHost: true, foeNick: '', botLevel: botLv.current,
      key: 'bot-' + Date.now(),
    });
    setView('battle');
    if (keepSeeking) hall.current?.setSeeking(true);
  }, [clearTimers, closeLink]);

  const startSearch = useCallback((avoidPrev: boolean) => {
    clearTimers();
    closeLink();
    pairing.current = null;
    matchKind.current = 'random';
    setNetMsg({ text: '' });
    setSeekLeft(SEEK_SECONDS);
    setView('search');

    const h = hall.current;
    const prev = avoidPrev ? lastPeer.current : null;
    h?.setSeeking(true, prev ? { id: prev.id, ms: REMATCH_GRACE } : undefined);

    // after the grace period, offer the previous opponent a rematch directly
    if (prev) {
      later(() => {
        if (viewRef.current !== 'search' || pairing.current) return;
        const still = h?.memberById(prev.id);
        if (still) {
          const p = h!.invite(still, 'rematch');
          enterHandoff(p);
        }
      }, REMATCH_GRACE);
    }

    let left = SEEK_SECONDS;
    const tick = window.setInterval(() => {
      left -= 1;
      setSeekLeft(Math.max(0, left));
      if (left > 0) return;
      window.clearInterval(tick);
      if (viewRef.current !== 'search') return;
      setNetMsg({ text: T[lang].skNone });
      later(() => {
        if (viewRef.current !== 'search') return;
        botLv.current = START_LV;
        startBot(true);
      }, 1100);
    }, 1000);
    timers.current.push(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimers, closeLink, later, lang, startBot]);

  const enterHandoff = useCallback((p: Pairing) => {
    clearTimers();
    pairing.current = p;
    matchKind.current = p.kind === 'friend' ? 'friend' : 'random';
    lastPeer.current = p.peer;
    hall.current?.setSeeking(false);
    openLink(p.matchId, p.peer);
    setHandoffLeft(HANDOFF_SECONDS);
    setView('handoff');

    let left = HANDOFF_SECONDS;
    const tick = window.setInterval(() => {
      left -= 1;
      setHandoffLeft(Math.max(0, left));
      if (left > 0) return;
      window.clearInterval(tick);
      if (viewRef.current !== 'handoff') return;
      if (p.isHost) link.current?.send('start', {});
      setBattle({
        mode: 'pvp', isHost: p.isHost, foeNick: p.peer.nick || '?',
        botLevel: botLv.current, key: p.matchId,
      });
      setView('battle');
    }, 1000);
    timers.current.push(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimers, openLink]);

  /* guest side of a friend lobby waits for the host's start */
  useEffect(() => {
    if (view !== 'room' || !link.current) return;
    const l = link.current;
    l.on('start', () => {
      const p = pairing.current;
      if (!p) return;
      setBattle({
        mode: 'pvp', isHost: false, foeNick: p.peer.nick || '?',
        botLevel: botLv.current, key: p.matchId,
      });
      setView('battle');
    });
    l.onPeerLeft(() => {
      setNetMsg({ text: T[lang].netLeft, tone: 'err' });
      setView('friend');
    });
  }, [view, lang]);

  /* ---------------- finish ---------------- */
  const onFinish = useCallback(async (r: FinishResult) => {
    clearTimers();
    setResult(r);
    setSaveNote(null);
    setView('result');

    const p = pairing.current;
    if (p && battle?.mode === 'pvp') {
      const ok = await saveMatch({
        mode: matchKind.current,
        lang,
        rounds: r.exchanges,
        endReason: r.forfeit ? 'forfeit' : 'ko',
        iWon: r.won,
        me: { nick: nick || 'Wanderer', speed: r.speed, accuracy: r.accuracy, combo: r.bestCombo, hp: r.hpLeft },
        them: { nick: p.peer.nick || '?', speed: 0, accuracy: 0, combo: 0, hp: r.foeHpLeft },
      });
      if (r.won) setSaveNote(ok ? { text: T[lang].saved } : { text: T[lang].saveFailed, bad: true });
    }
    closeLink();
    recentMatches(6).then(setRecent);
  }, [battle?.mode, clearTimers, closeLink, lang, nick]);

  const again = useCallback(() => {
    if (matchKind.current === 'friend' && pairing.current) {
      const p = pairing.current;
      if (p.isHost) {
        openLink(p.matchId, p.peer);
        later(() => {
          link.current?.send('start', {});
          setBattle({ mode: 'pvp', isHost: true, foeNick: p.peer.nick, botLevel: botLv.current, key: p.matchId + '-r' + Date.now() });
          setView('battle');
        }, 300);
      } else {
        setRoomLead(T[lang].roomGuest);
        setView('room');
      }
      return;
    }
    startSearch(true);
  }, [lang, later, openLink, startSearch]);

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && view === 'result') { e.preventDefault(); again(); }
      if (e.key === 'Escape' && view !== 'menu' && view !== 'battle') toMenu();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [view, again, toMenu]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  /* ---------------- story ---------------- */
  const gather = () => {
    setEnergy((n) => {
      const next = n + 1;
      try { localStorage.setItem('kw_energy', String(next)); } catch {}
      return next;
    });
  };

  /* ---------------- render ---------------- */
  const inBattle = view === 'battle' && battle;

  return (
    <>
      <Backdrop />

      <div className={`hall-badge ${hallStatus}`} hidden={Boolean(inBattle)}>
        <span className="hall-dot" />
        <span>
          {hallStatus === 'online'
            ? `${waiting} ${lang === 'ko' ? '명 대기' : 'waiting'}`
            : hallStatus === 'connecting'
              ? (lang === 'ko' ? '연결 중' : 'connecting')
              : (lang === 'ko' ? '오프라인' : 'offline')}
        </span>
      </div>

      <div className="lang-bar" hidden={Boolean(inBattle)}>
        <span className="lb-label">언어 / Language</span>
        <select
          className="lang-select"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          aria-label="언어 / Language"
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
      </div>

      {inBattle && (
        <Battle
          lang={lang}
          mode={battle.mode}
          isHost={battle.isHost}
          myNick={nick || 'Wanderer'}
          foeNick={battle.foeNick}
          link={link.current}
          botLevel={battle.botLevel}
          seeking={battle.mode === 'bot'}
          matchKey={battle.key}
          onFinish={onFinish}
          onExit={toMenu}
        />
      )}

      {!inBattle && (
        <div className="ui">
          {view === 'menu' && (
            <div className="panel">
              <Crest />
              <h1 className="title">KEYBOARD WAR</h1>
              <p className="subtitle">{d.tagline}</p>

              <div className="nick-block">
                <div className="section-label">{d.nickLabel}</div>
                <div className="nick-row">
                  <input
                    className="nick-input"
                    value={nick}
                    maxLength={16}
                    placeholder={d.nickPlaceholder}
                    onChange={(e) => setNick(e.target.value)}
                  />
                </div>
                <p className="nick-note">{d.nickNote}</p>
              </div>

              <div className="menu-list row">
                <button className="menu-btn" data-test="ranked" onClick={() => setView('ranked')}>
                  {d.ranked}<span className="mb-sub">Ranked</span>
                </button>
                <button className="menu-btn" data-test="versus" onClick={() => setView('versus')}>
                  {d.versus}<span className="mb-sub">Versus</span>
                </button>
                <button className="menu-btn" data-test="story" onClick={() => setView('story')}>
                  {d.story}<span className="mb-sub">Story</span>
                </button>
              </div>
              <p className="foot-hint">{d.menuHint}</p>
            </div>
          )}

          {view === 'ranked' && (
            <div className="panel">
              <div className="panel-title">{d.rkTitle}</div>
              <p className="panel-lead">{d.rkLead}</p>
              <p className="panel-sub">{d.rkSub}</p>
              <button className="btn-ghost" onClick={toMenu}>{d.back}</button>
            </div>
          )}

          {view === 'story' && (
            <div className="panel">
              <div className="panel-title">{d.stTitle}</div>
              <p className="panel-lead">{d.stLead}</p>
              <p className="panel-sub">{d.stSub}</p>
              <div className="orb-wrap" onClick={gather}>
                <div className="orb-ring" />
                <div className="orb" />
              </div>
              <div className="energy-num">{energy.toLocaleString()}</div>
              <div className="energy-label">{d.energyLabel}</div>
              <div className="energy-bar">
                <div className="efill" style={{ width: Math.min(100, (energy / ENERGY_GOAL) * 100) + '%' }} />
              </div>
              <div className="energy-goal">
                {energy >= ENERGY_GOAL ? d.energyDone : d.energyGoal(energy, ENERGY_GOAL)}
              </div>
              <button className="btn-ghost" onClick={toMenu}>{d.back}</button>
            </div>
          )}

          {view === 'versus' && (
            <div className="panel">
              <div className="panel-title">{d.vsTitle}</div>
              <p className="panel-lead">{d.vsLead}</p>
              <div className="menu-list">
                <button className="menu-btn" data-test="random" onClick={() => startSearch(false)}>
                  {d.vsRandom}<span className="mb-sub">Random — live or bot</span>
                </button>
                <button
                  className="menu-btn"
                  data-test="friend"
                  onClick={() => { setFriendCode(''); setNetMsg({ text: '' }); setView('friend'); }}
                >
                  {d.vsFriend}<span className="mb-sub">Play with a friend</span>
                </button>
              </div>
              <button className="btn-ghost" onClick={toMenu}>{d.back}</button>
            </div>
          )}

          {view === 'search' && (
            <div className="panel">
              <div className="panel-title">{d.skTitle}</div>
              <p className="panel-lead">{lastPeer.current ? d.skRematchAsk : d.skLead}</p>
              <div className="seek-ring">
                <i /><i /><i />
                <div className="seek-count">{seekLeft}</div>
              </div>
              <div className={`net-status ${netMsg.tone ?? ''}`}>{netMsg.text}</div>
              <button className="btn-ghost" onClick={() => { hall.current?.setSeeking(false); clearTimers(); setView('versus'); }}>
                {d.cancel}
              </button>
            </div>
          )}

          {view === 'handoff' && (
            <div className="panel">
              <div className="panel-title">{d.hoTitle}</div>
              <p className="panel-lead">{d.hoLead}</p>
              <div className="handoff-num"><span key={handoffLeft}>{handoffLeft}</span></div>
              <div className="room-grid">
                <div className="room-seat">
                  <div className="rs-role">{d.hoYou}</div>
                  <div className="rs-code">{nick || 'Wanderer'}</div>
                </div>
                <div className="room-vs">VS</div>
                <div className="room-seat">
                  <div className="rs-role">{d.hoThem}</div>
                  <div className="rs-code">{pairing.current?.peer.nick || '?'}</div>
                </div>
              </div>
            </div>
          )}

          {view === 'friend' && (
            <div className="panel">
              <div className="panel-title">{d.frTitle}</div>
              <div className="code-block">
                <div className="cb-label">{d.frMyLabel}</div>
                <div
                  className="cb-code"
                  onClick={() => {
                    navigator.clipboard?.writeText(code).then(
                      () => setNetMsg({ text: d.copied, tone: 'ok' }),
                      () => {},
                    );
                  }}
                >
                  {code}
                </div>
                <div className="cb-note">{d.frMyNote}</div>
              </div>
              <div className="section-label">{d.frEnterLabel}</div>
              <div className="code-form">
                <input
                  className="code-input"
                  maxLength={6}
                  value={friendCode}
                  placeholder={d.frPlaceholder}
                  onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') connectFriend(); }}
                />
                <button className="btn-inline" onClick={connectFriend}>{d.confirm}</button>
              </div>
              <div className={`net-status ${netMsg.tone ?? ''}`}>{netMsg.text}</div>
              <button className="btn-ghost" onClick={toMenu}>{d.back}</button>
            </div>
          )}

          {view === 'room' && (
            <div className="panel">
              <div className="panel-title">{d.rmTitle}</div>
              <p className="panel-lead">{d.rmLead}</p>
              <div className="room-grid">
                <div className="room-seat">
                  <div className="rs-role">{d.rmYou}</div>
                  <div className="rs-code">{nick || 'Wanderer'}</div>
                </div>
                <div className="room-vs">VS</div>
                <div className="room-seat">
                  <div className="rs-role">{d.rmFriend}</div>
                  <div className="rs-code">{pairing.current?.peer.nick || '------'}</div>
                </div>
              </div>
              <div className="net-status ok">{roomLead}</div>
              <button
                className="btn-main"
                disabled={!pairing.current?.isHost}
                onClick={() => {
                  const p = pairing.current;
                  if (!p?.isHost) return;
                  link.current?.send('start', {});
                  setBattle({ mode: 'pvp', isHost: true, foeNick: p.peer.nick, botLevel: botLv.current, key: p.matchId });
                  setView('battle');
                }}
              >
                {d.startBtn}
              </button>
              <br />
              <button className="btn-ghost" onClick={toMenu}>{d.leave}</button>
            </div>
          )}

          {view === 'result' && result && (
            <div className="panel">
              <div className={`verdict ${result.won ? 'win' : 'lose'}`}>
                {result.forfeit ? d.forfeit : result.won ? d.win : d.lose}
              </div>
              <p className="verdict-sub">
                {result.forfeit ? d.forfeitSub : result.won ? d.winSub : d.loseSub}
              </p>
              <div className="stats">
                <div className="stat"><div className="sv">{result.speed}<small>{d.speedUnit}</small></div><div className="sl">{d.stSpeedL}</div></div>
                <div className="stat"><div className="sv">{result.accuracy}<small>%</small></div><div className="sl">{d.stAccL}</div></div>
                <div className="stat"><div className="sv">{result.bestCombo}</div><div className="sl">{d.stComboL}</div></div>
                <div className="stat"><div className="sv">{result.exchanges}</div><div className="sl">{d.stRoundsL}</div></div>
                <div className="stat"><div className="sv">{result.hpLeft}</div><div className="sl">{d.stHpL}</div></div>
              </div>
              {saveNote && <p className={`save-note ${saveNote.bad ? 'bad' : ''}`}>{saveNote.text}</p>}
              {recent.length > 0 && (
                <div className="recent">
                  <div className="section-label">{lang === 'ko' ? '최근 대전' : 'Recent matches'}</div>
                  {recent.map((m, i) => (
                    <div className="recent-row" key={i}>
                      <span><b>{m.p1_nick}</b> {lang === 'ko' ? '승' : 'beat'} {m.p2_nick}</span>
                      <span className="rr-meta">
                        {m.rounds}{lang === 'ko' ? '교전' : ' rounds'}
                        {m.end_reason === 'forfeit' ? (lang === 'ko' ? ' · 기권' : ' · forfeit') : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn-main" onClick={again}>{d.again}</button>
              <br />
              <button className="btn-ghost" onClick={toMenu}>{d.toMenu}</button>
              <p className="foot-hint">{d.resultHint}</p>
            </div>
          )}
        </div>
      )}
    </>
  );

  function connectFriend() {
    const h = hall.current;
    const c = friendCode.trim().toUpperCase();
    if (c.length !== 6) { setNetMsg({ text: d.netBad, tone: 'err' }); return; }
    if (c === code) { setNetMsg({ text: d.netSelf, tone: 'err' }); return; }
    if (!h || hallStatus !== 'online') { setNetMsg({ text: d.netDown, tone: 'err' }); return; }

    setNetMsg({ text: d.netSearching });
    const p = h.inviteByCode(c);
    if (!p) { setNetMsg({ text: d.netNone, tone: 'err' }); return; }
    pairing.current = p;
    matchKind.current = 'friend';
    lastPeer.current = p.peer;
    openLink(p.matchId, p.peer);
    setRoomLead(d.roomHost);
    setNetMsg({ text: d.netJoined, tone: 'ok' });
    setView('room');
  }
}
