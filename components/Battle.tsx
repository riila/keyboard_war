'use client';

import { useEffect, useRef } from 'react';
import { BattleEngine, type EngineOptions, type FinishResult } from '@/lib/engine';
import type { MatchLink } from '@/lib/net';
import type { Lang } from '@/lib/words';

export interface BattleProps {
  lang: Lang;
  mode: 'bot' | 'pvp';
  kind?: 'random' | 'friend';
  isHost: boolean;
  myNick: string;
  foeNick: string;
  link: MatchLink | null;
  botLevel?: number;
  seeking?: boolean;
  onFinish: (r: FinishResult) => void;
  onExit: () => void;
  /** Bumping this restarts the fight from scratch. */
  matchKey: string;
}

/**
 * React owns the screens; the fight itself runs imperatively.
 * A typing game cannot afford a React render on every keystroke, so the
 * engine writes to its own DOM and this component just gives it a mount
 * point and tears it down when the match is over.
 */
export default function Battle(props: BattleProps) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<BattleEngine | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (!host.current) return;
    const opts: EngineOptions = {
      lang: latest.current.lang,
      mode: latest.current.mode,
      kind: latest.current.kind,
      isHost: latest.current.isHost,
      myNick: latest.current.myNick,
      foeNick: latest.current.foeNick,
      link: latest.current.link,
      botLevel: latest.current.botLevel,
      onFinish: (r: FinishResult) => latest.current.onFinish(r),
      onExit: () => latest.current.onExit(),
    };
    const e = new BattleEngine(host.current, opts);
    engine.current = e;
    e.setSeekFlag(Boolean(latest.current.seeking));
    return () => { e.destroy(); engine.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.matchKey]);

  useEffect(() => {
    engine.current?.setSeekFlag(Boolean(props.seeking));
  }, [props.seeking]);

  return <div ref={host} />;
}
