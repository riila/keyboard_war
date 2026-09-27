import { decompose, matchLen, cumulative } from './hangul';
import { makePrompt, BOT_NAMES, type Lang } from './words';
import { T } from './i18n';
import {
  MAX_HP, START_LV, ADJUST_EVERY, ATK_MULT,
  botCps, botDelay, adjustLevel, damageFor, rollPotions,
  speedFor, accuracyFor, type Potion, type Side,
} from './rules';
import type { MatchLink } from './net';

export interface FinishResult {
  won: boolean;
  forfeit: boolean;
  speed: number;
  accuracy: number;
  bestCombo: number;
  exchanges: number;
  hpLeft: number;
  foeHpLeft: number;
}

export interface EngineOptions {
  lang: Lang;
  mode: 'bot' | 'pvp';
  /** Only meaningful for a pvp match: which label the chip shows. */
  kind?: 'random' | 'friend';
  isHost: boolean;
  foeNick: string;
  myNick: string;
  link: MatchLink | null;
  botLevel?: number;
  onFinish: (r: FinishResult) => void;
  onExit: () => void;
}

const BATTLE_HTML = `
<header class="hud">
  <div class="fighter ally">
    <div class="sigil" data-el="sigilAlly">
      <svg viewBox="0 0 80 90" aria-hidden="true">
        <defs><linearGradient id="gAlly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5cf5c0"/><stop offset="1" stop-color="#0c5a45"/>
        </linearGradient></defs>
        <path d="M40 2 76 22 76 68 40 88 4 68 4 22Z" fill="#071a16" stroke="#c9a763" stroke-width="1.6"/>
        <path d="M40 9 69 25 69 65 40 81 11 65 11 25Z" fill="none" stroke="#7e6634" stroke-width=".9"/>
        <path d="M40 20 L40 70 M28 34 L40 22 L52 34 M31 58 L49 58" stroke="url(#gAlly)" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        <circle cx="40" cy="45" r="7" fill="none" stroke="#35e0a6" stroke-width="1.4" opacity=".8"/>
      </svg>
    </div>
    <div class="fbody">
      <div class="fname" data-el="allyName"></div>
      <div class="ftitle" data-el="allyTitle"></div>
      <div class="bar-wrap">
        <div class="bar">
          <div class="ghost" data-el="ghostAlly"></div><div class="fill" data-el="hpAlly"></div>
          <div class="sheen"></div><div class="hpnum" data-el="hpNumAlly"></div>
        </div>
        <div class="rage" data-el="rageAlly"><div class="rfill" data-el="rageFillAlly"></div></div>
        <div class="rage-label" data-el="rageLabelAlly"></div>
        <div class="buffs" data-el="buffAlly"></div>
      </div>
    </div>
  </div>

  <div class="round-pill">
    <div class="rlabel" data-el="roundLabel"></div>
    <div class="rnum" data-el="roundNum">1</div>
    <div class="rmode" data-el="modeLabel"></div>
    <div class="rsets" data-el="setScore" hidden></div>
    <div class="rseek" data-el="seekFlag" hidden></div>
  </div>

  <div class="fighter foe">
    <div class="sigil" data-el="sigilFoe">
      <svg viewBox="0 0 80 90" aria-hidden="true">
        <defs><linearGradient id="gFoe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ff8a7d"/><stop offset="1" stop-color="#6d1a14"/>
        </linearGradient></defs>
        <path d="M40 2 76 22 76 68 40 88 4 68 4 22Z" fill="#1a0806" stroke="#c9a763" stroke-width="1.6"/>
        <path d="M40 9 69 25 69 65 40 81 11 65 11 25Z" fill="none" stroke="#7e6634" stroke-width=".9"/>
        <path d="M22 26 C34 42 34 56 26 70 M40 22 C52 40 52 58 42 74 M58 28 C68 44 66 58 58 70"
              stroke="url(#gFoe)" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <circle cx="40" cy="45" r="9" fill="none" stroke="#e8493c" stroke-width="1.2" opacity=".55"/>
      </svg>
    </div>
    <div class="fbody">
      <div class="fname" data-el="foeName"></div>
      <div class="ftitle" data-el="foeTitle"></div>
      <div class="bar-wrap">
        <div class="bar">
          <div class="ghost" data-el="ghostFoe"></div><div class="fill" data-el="hpFoe"></div>
          <div class="sheen"></div><div class="hpnum" data-el="hpNumFoe"></div>
        </div>
        <div class="rage" data-el="rageFoe"><div class="rfill" data-el="rageFillFoe"></div></div>
        <div class="rage-label" data-el="rageLabelFoe"></div>
        <div class="buffs" data-el="buffFoe"></div>
      </div>
    </div>
  </div>
</header>

<main class="arena">
  <div class="word-frame">
    <div class="word-kicker" data-el="kicker"></div>
    <div class="word" data-el="word"></div>
    <div class="word-hint" data-el="hint"></div>
  </div>
  <div class="tracks">
    <div class="trow ally"><div class="tname" data-el="tnameAlly"></div><div class="track"><div class="tfill" data-el="trackAlly"></div></div></div>
    <div class="trow foe"><div class="track"><div class="tfill" data-el="trackFoe"></div></div><div class="tname" data-el="tnameFoe"></div></div>
  </div>
  <div class="input-shell" data-el="inputShell">
    <div class="combo-chip" data-el="comboChip"></div>
    <input data-el="input" class="type-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" />
    <div class="input-state">
      <span class="st-chip" data-el="capsChip" hidden><span class="v" data-el="capsChipV"></span></span>
    </div>
    <div class="ime-note" data-el="imeNote"></div>
  </div>
</main>

<hr class="rule" />
<div class="exit-hint" data-el="exitHint"></div>
`;

/* A potion is drawn, not lettered: red vial for power, blue for healing.
   Plain fills only — no gradient ids to collide when several are on
   screen at once. */
function vial(kind: 'heal' | 'atk', cls = ''): string {
  const c = kind === 'heal'
    ? { liquid: '#2f8de0', deep: '#134a86', hi: '#bfe2ff' }
    : { liquid: '#d8342a', deep: '#7d1610', hi: '#ffb0a6' };
  return `<svg class="vial ${cls}" viewBox="0 0 28 38" aria-hidden="true">`
    + '<rect x="10" y="0" width="8" height="5" rx="1.6" fill="#c9a763"/>'
    + '<rect x="9" y="4.4" width="10" height="2.4" rx="1" fill="#8a7040"/>'
    + '<path d="M11 6.5 L11 13 C5.5 16.5 3 21 3 26.5 C3 32.5 7.9 36 14 36'
    + ' C20.1 36 25 32.5 25 26.5 C25 21 22.5 16.5 17 13 L17 6.5 Z"'
    + ' fill="rgba(6,16,20,.75)" stroke="rgba(255,255,255,.4)" stroke-width="1.2"/>'
    + `<path d="M4.2 20.5 C3.4 22.4 3 24.4 3 26.5 C3 32.5 7.9 36 14 36`
    + ` C20.1 36 25 32.5 25 26.5 C25 24.4 24.6 22.4 23.8 20.5 Z" fill="${c.liquid}"/>`
    + `<path d="M5.2 24 C4.4 26.6 4.6 30 6.4 32.4 C4 31 3 28.6 3 26.5 C3 25.6 3.1 24.8 3.3 24 Z"`
    + ` fill="${c.deep}" opacity=".85"/>`
    + `<ellipse cx="14" cy="20.5" rx="9.9" ry="1.5" fill="${c.hi}" opacity=".55"/>`
    + `<circle cx="10.5" cy="27" r="1.7" fill="${c.hi}" opacity=".5"/>`
    + `<circle cx="17" cy="30.5" r="1.1" fill="${c.hi}" opacity=".4"/>`
    + '<path d="M8.6 15.4 C6.2 18.8 5.2 22.4 5.4 26" stroke="rgba(255,255,255,.45)"'
    + ' stroke-width="1.5" fill="none" stroke-linecap="round"/>'
    + '</svg>';
}

type Fighter = { hp: number; rage: number; atk: number };

export class BattleEngine {
  private root: HTMLElement;
  private o: EngineOptions;
  private el: Record<string, HTMLElement> = {};
  private input!: HTMLInputElement;

  private phase: 'idle' | 'countdown' | 'round' | 'resolve' | 'over' = 'idle';
  private round = 0;
  private ally: Fighter = { hp: MAX_HP, rage: 0, atk: 0 };
  private foe: Fighter = { hp: MAX_HP, rage: 0, atk: 0 };
  private word = ''; private hint = ''; private wordLang: Lang = 'ko';
  private target: string[] = []; private cum: number[] = [0];
  private typed: string[] = []; private errFlag = false; private perfect = true;
  private roundT0 = 0; private foeDelay = 0; private foeCps = 0; private foeProg = 0;
  private lastSent = 0; private doneSent = false;
  private combo = 0; private foeCombo = 0; private bestCombo = 0; private exchanges = 0;
  private strokes = 0; private errors = 0; private units = 0; private timeMs = 0;
  private botLv = START_LV; private recent: boolean[] = [];
  private sets = { ally: 0, foe: 0 };
  private caps = false; private capsKnown = false;
  private raf = 0; private timers: number[] = [];
  private destroyed = false;
  /** Set the moment a fighter drops: the result is settled from here on. */
  private decided = false;

  constructor(root: HTMLElement, opts: EngineOptions) {
    this.root = root;
    this.o = opts;
    this.botLv = opts.botLevel ?? START_LV;
    root.className = 'stage';
    root.innerHTML = BATTLE_HTML;
    root.querySelectorAll<HTMLElement>('[data-el]').forEach((n) => {
      this.el[n.dataset.el as string] = n;
    });
    this.input = this.el.input as HTMLInputElement;

    this.bindInput(this.input);
    this.el.inputShell.addEventListener('mousedown', this.refocus);
    document.addEventListener('keydown', this.probeKey, true);
    document.addEventListener('keyup', this.probeKey, true);

    if (opts.link) this.wireLink(opts.link);
    this.paintStatic();
    this.renderHud();
    this.start();
  }

  /* ---------------- lifecycle ---------------- */

  private t() { return T[this.o.lang]; }

  private later(fn: () => void, ms: number) {
    const id = window.setTimeout(fn, ms);
    this.timers.push(id);
    return id;
  }
  private clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }

  destroy() {
    this.destroyed = true;
    this.phase = 'over';
    this.clearTimers();
    cancelAnimationFrame(this.raf);
    document.removeEventListener('keydown', this.probeKey, true);
    document.removeEventListener('keyup', this.probeKey, true);
    this.el.inputShell?.removeEventListener('mousedown', this.refocus);
    this.root.innerHTML = '';
  }

  /** Shown while a bot match keeps hunting for a live opponent. */
  setSeekFlag(on: boolean) {
    const n = this.el.seekFlag;
    if (!n) return;
    n.hidden = !on;
    n.textContent = this.t().seekFlag;
  }

  private start() {
    const d = this.t();
    this.phase = 'countdown';
    const steps = ['3', '2', '1', d.countGo];
    steps.forEach((s, i) => this.later(() => this.callout(s, i === 3), i * 560));
    const when = steps.length * 560 - 120;
    if (this.o.mode === 'bot' || this.o.isHost) this.later(() => this.startRound(), when);
    else this.later(() => { this.roundT0 = performance.now(); }, when);
  }

  /* ---------------- wire ---------------- */

  private wireLink(link: MatchLink) {
    link.on('round', (p) => {
      if (this.o.isHost || this.destroyed) return;
      this.applyRound(p.word, p.hint, p.wordLang);
    });
    link.on('prog', (p) => {
      if (this.destroyed) return;
      this.foeProg = p.p;
      (this.el.trackFoe as HTMLElement).style.width = p.p * 100 + '%';
    });
    link.on('done', () => {
      if (!this.o.isHost || this.destroyed) return;
      this.hostResolve('guest');
    });
    link.on('res', (p) => {
      if (this.o.isHost || this.destroyed) return;
      this.applyResolve(
        p.winner === 'guest' ? 'ally' : 'foe', p.dmg, p.ult,
        p.guestHp, p.hostHp, p.guestRage, p.hostRage, p.guestAtk, p.hostAtk,
        (p.potions ?? []).map((x: { side: string; kind: Potion['kind']; amount: number }) => ({
          side: (x.side === 'guest' ? 'ally' : 'foe') as Side,
          kind: x.kind,
          amount: x.amount,
        })),
      );
    });
    link.onPeerLeft(() => this.forfeit());
    link.on('bye', () => this.forfeit());
  }

  private forfeit() {
    if (this.destroyed || this.decided || this.phase === 'over') return;
    const live = this.phase === 'countdown' || this.phase === 'round' || this.phase === 'resolve';
    if (!live) return;
    this.finish(true, true);
  }

  /* ---------------- rounds ---------------- */

  private startRound() {
    this.round++;
    if (this.o.mode === 'pvp' && !this.o.isHost) return; // the guest waits
    const p = makePrompt(this.o.lang, this.round);
    if (this.o.mode === 'pvp') this.o.link?.send('round', { ...p });
    this.applyRound(p.word, p.hint, p.wordLang);
  }

  private applyRound(word: string, hint: string, wordLang: Lang) {
    if (this.destroyed) return;
    this.word = word; this.hint = hint; this.wordLang = wordLang;
    this.target = decompose(word);
    this.cum = cumulative(word);
    this.typed = []; this.errFlag = false; this.perfect = true;
    this.foeProg = 0; this.doneSent = false;

    const d = this.t();
    this.el.kicker.textContent = wordLang === 'ko' ? d.wordKoTag : d.wordEnTag;
    this.el.kicker.classList.toggle('ko', wordLang === 'ko');
    (this.el.trackAlly as HTMLElement).style.width = '0%';
    (this.el.trackFoe as HTMLElement).style.width = '0%';

    this.resetInput(true);
    this.renderWord();
    this.renderInputState();
    this.renderHud();

    this.phase = 'round';
    this.roundT0 = performance.now();

    if (this.o.mode === 'bot') {
      this.foeCps = botCps(this.botLv, wordLang) * (1 + (Math.random() * 2 - 1) * 0.12);
      const dl = botDelay(this.botLv);
      this.foeDelay = dl[0] + Math.random() * (dl[1] - dl[0]);
    }
    this.loop();
  }

  private loop = () => {
    if (this.phase !== 'round' || this.destroyed) return;
    if (this.o.mode === 'bot') {
      const elapsed = performance.now() - this.roundT0 - this.foeDelay;
      this.foeProg = Math.max(0, Math.min(1, (elapsed * this.foeCps) / 1000 / this.target.length));
      (this.el.trackFoe as HTMLElement).style.width = this.foeProg * 100 + '%';
      if (this.foeProg >= 1) { this.resolve('foe'); return; }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private myProgress() {
    return this.target.length ? matchLen(this.typed, this.target) / this.target.length : 0;
  }

  private withAtkBuff(side: Side, dmg: number) {
    const o = side === 'ally' ? this.ally : this.foe;
    if (o.atk > 0) { o.atk--; return Math.round(dmg * ATK_MULT); }
    return dmg;
  }

  /* ---------------- resolution ---------------- */

  private resolve(winner: Side) {
    cancelAnimationFrame(this.raf);
    if (this.phase !== 'round') return;
    this.phase = 'resolve';
    this.blurInput();
    this.exchanges++;
    this.timeMs += performance.now() - this.roundT0;

    if (winner === 'ally') {
      this.combo++; this.foeCombo = 0;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.units += this.target.length;
      const ult = this.ally.rage >= 100;
      const dmg = this.withAtkBuff('ally', damageFor(this.foeProg, this.combo, ult));
      this.foe.hp -= dmg;
      if (ult) this.ally.rage = 0;
      else this.ally.rage = Math.min(100, this.ally.rage + (this.perfect ? 24 : 12));
      this.strikeFx('foe', dmg, ult);
    } else {
      this.combo = 0; this.foeCombo++;
      this.units += matchLen(this.typed, this.target);
      const ult = this.foe.rage >= 100;
      const dmg = this.withAtkBuff('foe', damageFor(this.myProgress(), 2, ult));
      this.ally.hp -= dmg;
      if (ult) this.foe.rage = 0;
      else this.foe.rage = Math.min(100, this.foe.rage + 16);
      this.strikeFx('ally', dmg, ult);
    }

    this.applyPotions(rollPotions(this.combo, this.foeCombo));

    if (this.o.mode === 'bot') {
      this.recent.push(winner === 'ally');
      if (this.recent.length >= ADJUST_EVERY) {
        const { lv, dir } = adjustLevel(this.botLv, this.recent);
        this.recent = [];
        if (dir) { this.botLv = lv; this.renderHud(); this.flashLevel(dir); }
      }
    }

    this.renderHud();
    this.nextBeat();
  }

  private hostResolve(who: 'host' | 'guest') {
    cancelAnimationFrame(this.raf);
    if (this.phase !== 'round') return;
    this.phase = 'resolve';

    const hostWon = who === 'host';
    const loserProg = hostWon ? this.foeProg : this.myProgress();
    const rage = hostWon ? this.ally.rage : this.foe.rage;
    const ult = rage >= 100;
    const dmg = this.withAtkBuff(
      hostWon ? 'ally' : 'foe',
      damageFor(loserProg, hostWon ? this.combo + 1 : 2, ult),
    );

    if (hostWon) {
      this.foe.hp -= dmg;
      if (ult) this.ally.rage = 0; else this.ally.rage = Math.min(100, this.ally.rage + 18);
    } else {
      this.ally.hp -= dmg;
      if (ult) this.foe.rage = 0; else this.foe.rage = Math.min(100, this.foe.rage + 18);
    }

    const pots = rollPotions(hostWon ? this.combo + 1 : 0, hostWon ? 0 : this.foeCombo + 1);

    this.o.link?.send('res', {
      winner: hostWon ? 'host' : 'guest', dmg, ult,
      hostHp: this.ally.hp, guestHp: this.foe.hp,
      hostRage: this.ally.rage, guestRage: this.foe.rage,
      hostAtk: this.ally.atk, guestAtk: this.foe.atk,
      potions: pots.map((p) => ({ side: p.side === 'ally' ? 'host' : 'guest', kind: p.kind, amount: p.amount })),
    });

    this.applyResolve(hostWon ? 'ally' : 'foe', dmg, ult,
      this.ally.hp, this.foe.hp, this.ally.rage, this.foe.rage,
      this.ally.atk, this.foe.atk, pots);
  }

  private applyResolve(
    side: Side, dmg: number, ult: boolean,
    myHp: number, theirHp: number, myRage: number, theirRage: number,
    myAtk?: number, theirAtk?: number, pots?: Potion[],
  ) {
    cancelAnimationFrame(this.raf);
    if (this.phase === 'over' || this.destroyed) return;
    this.phase = 'resolve';
    this.blurInput();
    this.exchanges++;
    this.timeMs += performance.now() - this.roundT0;

    if (side === 'ally') {
      this.combo++; this.foeCombo = 0;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.units += this.target.length;
    } else {
      this.combo = 0; this.foeCombo++;
      this.units += matchLen(this.typed, this.target);
    }

    this.ally.hp = myHp; this.foe.hp = theirHp;
    this.ally.rage = myRage; this.foe.rage = theirRage;
    if (typeof myAtk === 'number') this.ally.atk = myAtk;
    if (typeof theirAtk === 'number') this.foe.atk = theirAtk;

    this.strikeFx(side === 'ally' ? 'foe' : 'ally', dmg, ult);
    if (pots?.length) this.applyPotions(pots);
    this.renderHud();
    this.nextBeat();
  }

  private nextBeat() {
    if (this.ally.hp <= 0 || this.foe.hp <= 0) {
      // a bot match is a holding pattern, not a contest: it never ends
      if (this.o.mode === 'bot') { this.later(() => this.nextSet(), 1100); return; }
      // the fight is decided; the loser must not read the winner's exit as a forfeit
      this.decided = true;
      this.later(() => this.finish(this.foe.hp <= 0, false), 900);
      return;
    }
    if (this.o.mode === 'bot' || this.o.isHost) this.later(() => this.startRound(), 780);
  }

  private nextSet() {
    const won = this.foe.hp <= 0;
    if (won) this.sets.ally++; else this.sets.foe++;
    this.callout(won ? this.t().setWin : this.t().setLose, won);

    this.ally = { hp: MAX_HP, rage: 0, atk: 0 };
    this.foe = { hp: MAX_HP, rage: 0, atk: 0 };
    this.combo = 0; this.foeCombo = 0;

    const bars = [this.el.hpAlly, this.el.hpFoe, this.el.ghostAlly, this.el.ghostFoe];
    bars.forEach((n) => (n.style.transition = 'none'));
    this.renderHud();
    requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach((n) => (n.style.transition = ''))));

    this.later(() => this.startRound(), 1200);
  }

  private finish(won: boolean, forfeit: boolean) {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.clearTimers();
    cancelAnimationFrame(this.raf);
    const minutes = this.timeMs / 60000;
    this.o.onFinish({
      won, forfeit,
      speed: speedFor(this.o.lang, this.units, minutes),
      accuracy: accuracyFor(this.strokes, this.errors),
      bestCombo: this.bestCombo,
      exchanges: this.exchanges,
      hpLeft: Math.max(0, this.ally.hp),
      foeHpLeft: Math.max(0, this.foe.hp),
    });
  }

  /* ---------------- potions ---------------- */

  private applyPotions(list: Potion[]) {
    if (!list.length) return;
    const sides = new Set<string>();
    list.forEach((p, i) => {
      const tgt = p.side === 'ally' ? this.ally : this.foe;
      if (p.kind === 'heal') tgt.hp = Math.min(MAX_HP, tgt.hp + p.amount);
      else tgt.atk += p.amount;
      sides.add(p.side);
      this.later(() => { this.potionFx(p); this.renderHud(); }, 420 + i * 240);
    });
    if (sides.size === 2) this.later(() => this.callout(this.t().supply, true), 380);
  }

  /* ---------------- input ---------------- */

  private refocus = (e: MouseEvent) => {
    if (this.phase === 'round' && e.target !== this.input) {
      e.preventDefault();
      this.input.focus();
    }
  };

  private blurInput() {
    try { this.input.blur(); this.input.value = ''; } catch {}
  }

  /**
   * The field is rebuilt every round. A cloned node carries no IME
   * composition state, so a half-composed syllable from the previous word
   * can never leak into the next one.
   */
  private resetInput(focus: boolean) {
    const old = this.input;
    try { old.blur(); } catch {}
    old.value = '';
    const fresh = old.cloneNode(false) as HTMLInputElement;
    fresh.value = '';
    old.replaceWith(fresh);
    this.input = fresh;
    this.el.input = fresh;
    fresh.placeholder = this.t().placeholder;
    this.bindInput(fresh);
    if (focus) {
      fresh.focus();
      this.later(() => { if (this.input === fresh && !this.typed.length) fresh.value = ''; }, 0);
    }
  }

  private bindInput(node: HTMLInputElement) {
    node.addEventListener('input', this.onType);
    node.addEventListener('compositionend', () => {
      if (this.phase !== 'round') node.value = '';
    });
  }

  private onType = (e: Event) => {
    const node = e.target as HTMLInputElement;
    if (node !== this.input) { node.value = ''; return; }
    if (this.phase !== 'round') { node.value = ''; return; }

    const prevLen = this.typed.length;
    this.typed = decompose(node.value);
    if (this.typed.length > prevLen) this.strokes += this.typed.length - prevLen;

    const m = matchLen(this.typed, this.target);
    const ok = m === this.typed.length;

    if (!ok) {
      if (!this.errFlag) {
        this.errors++; this.perfect = false; this.combo = 0;
        node.classList.remove('err'); void node.offsetWidth; node.classList.add('err');
      }
      this.errFlag = true;
    } else {
      this.errFlag = false;
      node.classList.remove('err');
    }

    const p = this.renderWord();
    this.renderHud();

    if (this.o.mode === 'pvp' && this.o.link) {
      const now = performance.now();
      if (now - this.lastSent > 90) { this.lastSent = now; this.o.link.send('prog', { p }); }
    }

    if (ok && this.typed.length === this.target.length && this.target.length > 0) {
      if (this.o.mode === 'bot') this.resolve('ally');
      else if (this.o.isHost) this.hostResolve('host');
      else if (!this.doneSent) {
        this.doneSent = true;
        this.phase = 'resolve';
        this.o.link?.send('prog', { p: 1 });
        this.o.link?.send('done', {});
      }
    }
  };

  /** Caps Lock is the one input-state flag a browser can actually read. */
  private probeKey = (e: KeyboardEvent) => {
    let caps = this.caps, known = this.capsKnown;
    if (typeof e.getModifierState === 'function') {
      try { caps = e.getModifierState('CapsLock'); known = true; } catch {}
    }
    if (!known && e.type === 'keydown' && /^[a-zA-Z]$/.test(e.key) && !e.shiftKey) {
      caps = e.key === e.key.toUpperCase(); known = true;
    }
    if (caps !== this.caps || known !== this.capsKnown) {
      this.caps = caps; this.capsKnown = known;
      this.renderInputState();
    }
    if (e.type === 'keydown' && e.key === 'Escape') this.o.onExit();
  };

  /* ---------------- render ---------------- */

  private paintStatic() {
    const d = this.t();
    this.el.allyName.textContent = this.o.myNick;
    this.el.allyTitle.textContent = d.allyTitle;
    this.el.roundLabel.textContent = d.round;
    this.el.tnameAlly.textContent = d.you;
    this.el.tnameFoe.textContent = d.rival;
    this.el.exitHint.textContent = d.exitHint;
    this.input.placeholder = d.placeholder;
    this.el.imeNote.textContent = d.imeKo;
  }

  private renderInputState() {
    const d = this.t();
    const on = this.capsKnown && this.caps;
    const bad = on && this.wordLang === 'en';
    this.el.capsChip.hidden = !on;
    this.el.capsChipV.textContent = d.capsOn;
    this.el.capsChip.classList.toggle('bad', bad);
    this.el.imeNote.textContent = bad ? d.capsWarn : this.wordLang === 'ko' ? d.imeKo : d.imeEn;
    this.el.imeNote.classList.toggle('warn', bad);
  }

  private renderWord() {
    const m = matchLen(this.typed, this.target);
    let done = 0;
    for (let i = 1; i < this.cum.length; i++) { if (this.cum[i] <= m) done = i; else break; }

    let html = '';
    Array.from(this.word).forEach((ch, i) => {
      const cls = i < done ? 'done' : i === done ? 'cur' : '';
      const sp = ch === ' ' ? ' sp' : '';
      html += `<span class="ch ${cls}${sp}">${ch === ' ' ? '&nbsp;' : ch}</span>`;
    });
    this.el.word.innerHTML = html;
    this.el.word.classList.toggle('err', this.errFlag);
    this.el.hint.textContent = this.hint;

    const p = this.target.length ? m / this.target.length : 0;
    (this.el.trackAlly as HTMLElement).style.width = p * 100 + '%';
    return p;
  }

  private renderHud() {
    const d = this.t();
    const a = Math.max(0, this.ally.hp), f = Math.max(0, this.foe.hp);
    (this.el.hpAlly as HTMLElement).style.width = (a / MAX_HP) * 100 + '%';
    (this.el.hpFoe as HTMLElement).style.width = (f / MAX_HP) * 100 + '%';
    (this.el.ghostAlly as HTMLElement).style.width = (a / MAX_HP) * 100 + '%';
    (this.el.ghostFoe as HTMLElement).style.width = (f / MAX_HP) * 100 + '%';
    this.el.hpNumAlly.textContent = `${a} / ${MAX_HP}`;
    this.el.hpNumFoe.textContent = `${f} / ${MAX_HP}`;

    (this.el.rageFillAlly as HTMLElement).style.width = Math.min(100, this.ally.rage) + '%';
    (this.el.rageFillFoe as HTMLElement).style.width = Math.min(100, this.foe.rage) + '%';
    this.el.rageAlly.classList.toggle('full', this.ally.rage >= 100);
    this.el.rageFoe.classList.toggle('full', this.foe.rage >= 100);
    this.el.rageLabelAlly.classList.toggle('ready', this.ally.rage >= 100);
    this.el.rageLabelFoe.classList.toggle('ready', this.foe.rage >= 100);
    this.el.rageLabelAlly.textContent = this.ally.rage >= 100 ? `${d.rage} — ${d.ult}` : d.rage;
    this.el.rageLabelFoe.textContent = this.foe.rage >= 100 ? `${d.rage} — ${d.ult}` : d.rage;

    this.el.buffAlly.innerHTML = this.ally.atk > 0
      ? `<span class="buff">${vial('atk')}${d.buffAtk(this.ally.atk)}</span>` : '';
    this.el.buffFoe.innerHTML = this.foe.atk > 0
      ? `<span class="buff">${vial('atk')}${d.buffAtk(this.foe.atk)}</span>` : '';

    const showSets = this.o.mode === 'bot' && (this.sets.ally || this.sets.foe);
    this.el.setScore.hidden = !showSets;
    if (showSets) this.el.setScore.textContent = `${this.sets.ally} : ${this.sets.foe}`;

    this.el.roundNum.textContent = String(Math.max(1, this.round));
    this.el.modeLabel.textContent =
      this.o.mode === 'bot'
        ? d.modeBot(this.botLv)
        : this.o.kind === 'friend' ? d.modeFriend : d.modeRandom;

    if (this.o.mode === 'bot') {
      const tier = this.botLv <= 3 ? 0 : this.botLv <= 7 ? 1 : 2;
      this.el.foeName.textContent = `${BOT_NAMES[this.o.lang][tier]} (${this.o.lang === 'ko' ? '봇' : 'BOT'})`;
      this.el.foeTitle.innerHTML = `${d.foeTitle} · <span class="lv">Lv.${this.botLv}</span>`;
    } else {
      this.el.foeName.textContent = this.o.foeNick;
      this.el.foeTitle.textContent = d.foeTitle;
    }

    if (this.combo >= 2) {
      this.el.comboChip.textContent = d.comboFmt(this.combo);
      this.el.comboChip.classList.add('on');
    } else this.el.comboChip.classList.remove('on');
  }

  /* ---------------- effects ---------------- */

  private fxAt(node: HTMLElement) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  private fxLayer() {
    let n = document.getElementById('kw-fx');
    if (!n) {
      n = document.createElement('div');
      n.id = 'kw-fx';
      document.body.appendChild(n);
    }
    return n;
  }
  private add(node: HTMLElement, ms: number) {
    this.fxLayer().appendChild(node);
    window.setTimeout(() => node.remove(), ms);
  }

  private flashLevel(dir: number) {
    const chip = this.el.foeTitle.querySelector('.lv');
    if (!chip) return;
    chip.classList.remove('up', 'down');
    void (chip as HTMLElement).offsetWidth;
    chip.classList.add(dir > 0 ? 'up' : 'down');
  }

  private callout(text: string, good: boolean) {
    const c = document.createElement('div');
    c.className = 'callout ' + (good ? 'good' : 'bad');
    c.textContent = text;
    this.add(c, 1000);
  }

  private flash(color: string) {
    const f = document.createElement('div');
    f.className = 'screenflash';
    f.style.background = color;
    this.add(f, 460);
  }

  private sweep() {
    const s = document.createElement('div');
    s.className = 'ult-sweep';
    this.add(s, 680);
  }

  private shake() {
    this.root.classList.remove('shake');
    void this.root.offsetWidth;
    this.root.classList.add('shake');
  }

  private sigilHit(which: Side) {
    const n = which === 'foe' ? this.el.sigilFoe : this.el.sigilAlly;
    n.classList.remove('hit'); void n.offsetWidth; n.classList.add('hit');
  }

  private showDamage(target: Side, amount: number, crit: boolean) {
    const p = this.fxAt(target === 'foe' ? this.el.sigilFoe : this.el.sigilAlly);
    const d = document.createElement('div');
    d.className = `dmg ${target === 'foe' ? 'on-foe' : 'on-ally'}${crit ? ' crit' : ''}`;
    d.textContent = '-' + amount;
    d.style.left = p.x + 'px';
    d.style.top = p.y - 20 + 'px';
    this.add(d, 1100);
  }

  private showSlash(target: Side) {
    const p = this.fxAt(target === 'foe' ? this.el.sigilFoe : this.el.sigilAlly);
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('div');
      s.className = 'slash';
      s.style.left = p.x - 150 + 'px';
      s.style.top = p.y - 26 + i * 22 + 'px';
      s.style.setProperty('--w', 240 + Math.random() * 120 + 'px');
      s.style.transform = `rotate(${-16 + i * 12}deg)`;
      s.style.animationDelay = i * 55 + 'ms';
      this.add(s, 500 + i * 60);
    }
  }

  private showSparks(target: Side, color: string) {
    const p = this.fxAt(target === 'foe' ? this.el.sigilFoe : this.el.sigilAlly);
    const b = document.createElement('div');
    b.className = 'burst';
    b.style.left = p.x + 'px';
    b.style.top = p.y + 'px';
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('div');
      s.className = 'spark';
      const a = Math.random() * Math.PI * 2;
      const dd = 40 + Math.random() * 90;
      s.style.setProperty('--sx', (Math.cos(a) * dd).toFixed(1) + 'px');
      s.style.setProperty('--sy', (Math.sin(a) * dd).toFixed(1) + 'px');
      s.style.background = color;
      s.style.boxShadow = '0 0 8px ' + color;
      s.style.animationDelay = Math.random() * 90 + 'ms';
      b.appendChild(s);
    }
    this.add(b, 900);
  }

  private potionFx(p: Potion) {
    const d = this.t();
    const at = this.fxAt(p.side === 'ally' ? this.el.sigilAlly : this.el.sigilFoe);
    const n = document.createElement('div');
    n.className = 'pot ' + p.kind;
    n.innerHTML = vial(p.kind) + '<span>'
      + (p.kind === 'heal' ? `＋${p.amount} ${d.potHeal}` : d.potAtk) + '</span>';
    n.style.left = at.x + 'px';
    n.style.top = at.y + 118 + 'px';   // below the HUD, in open arena space
    this.fxLayer().appendChild(n);

    // the label is wide and the sigils sit near the edges — keep it on screen
    const r = n.getBoundingClientRect(), pad = 14;
    if (r.left < pad) n.style.left = at.x + (pad - r.left) + 'px';
    else if (r.right > window.innerWidth - pad)
      n.style.left = at.x - (r.right - (window.innerWidth - pad)) + 'px';

    window.setTimeout(() => n.remove(), 1400);
    this.showSparks(p.side, p.kind === 'heal' ? '#8fc9ff' : '#ff8a7d');
  }

  private strikeFx(target: Side, dmg: number, ult: boolean) {
    const d = this.t();
    if (ult) { this.sweep(); this.flash(target === 'foe' ? 'rgba(242,223,174,.5)' : 'rgba(232,73,60,.4)'); }
    this.showSlash(target);
    this.showSparks(target, target === 'foe' ? '#ffd08a' : '#ff8b7f');
    this.showDamage(target, dmg, ult);
    this.sigilHit(target);
    this.shake();
    if (target === 'ally') this.flash('rgba(232,73,60,.3)');
    this.callout(ult ? d.ult : target === 'foe' ? d.hitGood : d.hitBad, target === 'foe');
  }
}
