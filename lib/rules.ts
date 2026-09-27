import type { Lang } from './words';

export const MAX_HP = 100;
export const START_LV = 5;
export const ADJUST_EVERY = 2;
export const SEEK_SECONDS = 5;
export const HANDOFF_SECONDS = 3;
export const ENERGY_GOAL = 10000;

/* ---------------- bot ---------------- */

export function botCps(lv: number, wordLang: Lang): number {
  return wordLang === 'ko' ? 1.7 + lv * 0.55 : 1.35 + lv * 0.44;
}

export function botDelay(lv: number): [number, number] {
  const base = 760 - lv * 52;
  return [Math.max(110, base - 110), Math.max(190, base + 110)];
}

/** Two exchanges decide whether the bot climbs or eases off. */
export function adjustLevel(lv: number, recent: boolean[]): { lv: number; dir: -1 | 0 | 1 } {
  if (recent.length < ADJUST_EVERY) return { lv, dir: 0 };
  const wins = recent.slice(-ADJUST_EVERY).filter(Boolean).length;
  if (wins === ADJUST_EVERY && lv < 10) return { lv: lv + 1, dir: 1 };
  if (wins === 0 && lv > 1) return { lv: lv - 1, dir: -1 };
  return { lv, dir: 0 };
}

/* ---------------- damage ---------------- */

export function damageFor(loserProgress: number, combo: number, ultimate: boolean): number {
  let dmg = 9;
  dmg += Math.round((1 - loserProgress) * 10);
  dmg += Math.min(combo, 5) * 1.5;
  dmg = Math.round(dmg);
  if (ultimate) dmg = Math.round(dmg * 2.2);
  return Math.max(4, dmg);
}

/* ---------------- potions ---------------- */

export const HEAL_MIN = 12;
export const HEAL_SPAN = 9;
export const ATK_CHARGES = 2;
export const ATK_MULT = 1.5;
const DROP_BOTH = 0.1;
const DROP_ONE = 0.34;

export type Side = 'ally' | 'foe';
export interface Potion {
  side: Side;
  kind: 'heal' | 'atk';
  amount: number;
}

export function makePotion(side: Side, rng = Math.random): Potion {
  const heal = rng() < 0.5;
  return {
    side,
    kind: heal ? 'heal' : 'atk',
    amount: heal ? HEAL_MIN + Math.floor(rng() * HEAL_SPAN) : ATK_CHARGES,
  };
}

/**
 * Nothing is owned or carried while there are no accounts: a potion is rolled
 * during the exchange and drunk the moment it lands. Drops come from a random
 * roll after every exchange (sometimes for both fighters) plus a guaranteed
 * one at every fifth straight win.
 */
export function rollPotions(allyCombo: number, foeCombo: number, rng = Math.random): Potion[] {
  const out: Potion[] = [];
  if (allyCombo > 0 && allyCombo % 5 === 0) out.push(makePotion('ally', rng));
  if (foeCombo > 0 && foeCombo % 5 === 0) out.push(makePotion('foe', rng));

  const r = rng();
  if (r < DROP_BOTH) {
    out.push(makePotion('ally', rng));
    out.push(makePotion('foe', rng));
  } else if (r < DROP_ONE) {
    out.push(makePotion(rng() < 0.5 ? 'ally' : 'foe', rng));
  }
  return out;
}

/* ---------------- scoring ---------------- */

export function speedFor(lang: Lang, units: number, minutes: number): number {
  const m = Math.max(minutes, 1 / 60000);
  return lang === 'ko' ? Math.round(units / m) : Math.round(units / 5 / m);
}

export function accuracyFor(strokes: number, errors: number): number {
  if (!strokes) return 100;
  return Math.max(0, Math.round(((strokes - errors) / strokes) * 100));
}
