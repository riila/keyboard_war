export type Lang = 'ko' | 'en';
export type Pair = readonly [ko: string, en: string];

/** Paired so the opposite language doubles as the on-screen hint. */
const POOL: Record<1 | 2 | 3, readonly Pair[]> = {
  1: [
    ['정글','jungle'],['검객','blade'],['야수','beast'],['늪지','swamp'],
    ['협곡','canyon'],['폐허','ruins'],['주문','spell'],['방패','shield'],
    ['창날','spear'],['불꽃','flame'],['서리','frost'],['번개','bolt'],
    ['균열','rift'],['사냥','hunt'],['맹독','venom'],['그늘','shade'],
    ['광휘','radiance'],['전조','omen'],['맹세','oath'],['각인','sigil'],
    ['강철','steel'],['재앙','ruin'],['질주','sprint'],['고요','silence'],
  ],
  2: [
    ['수호자','guardian'],['파괴자','destroyer'],['정찰병','scout'],
    ['대장간','forge'],['나침반','compass'],['고대목','elderwood'],
    ['운명석','fatestone'],['심연부','abyss'],['유적지','relicsite'],
    ['마력석','manastone'],['야영지','campsite'],['추적자','tracker'],
    ['약초꾼','herbalist'],['덩굴숲','vinewood'],['안개골','mistvale'],
    ['모험가','wanderer'],['절벽길','cliffpath'],['보름달','fullmoon'],
    ['맹수떼','beasts'],['야행성','nocturnal'],
  ],
  3: [
    ['잊혀진 신전','forgotten temple'],['심연의 문','abyssal gate'],
    ['태양의 검','solar blade'],['정글 사냥꾼','jungle hunter'],
    ['고대의 맹세','ancient oath'],['폭풍의 눈','eye of storm'],
    ['서리 송곳니','frost fang'],['용의 둥지','dragon nest'],
    ['달빛 사냥','moonlit hunt'],['불멸의 심장','immortal heart'],
    ['황금 나침반','golden compass'],['그림자 군단','shadow legion'],
    ['덩굴의 주인','lord of vines'],['재의 협곡','ashen canyon'],
  ],
};

export const BOT_NAMES: Record<Lang, readonly string[]> = {
  ko: ['늪지 순찰자', '덩굴숲 추적자', '재의 협곡 군주'],
  en: ['Swamp Patrol', 'Vinewood Tracker', 'Warlord of Ashes'],
};

export function pickPair(round: number, rng = Math.random): Pair {
  const tier: 1 | 2 | 3 =
    round <= 3 ? 1 : round <= 7 ? (rng() < 0.35 ? 1 : 2) : rng() < 0.5 ? 2 : 3;
  const list = POOL[tier];
  return list[Math.floor(rng() * list.length)];
}

/** Korean UI serves words in both languages; English UI serves English only. */
export function chooseWordLang(uiLang: Lang, rng = Math.random): Lang {
  return uiLang === 'en' ? 'en' : rng() < 0.5 ? 'ko' : 'en';
}

export interface Prompt {
  word: string;
  hint: string;
  wordLang: Lang;
}

export function makePrompt(uiLang: Lang, round: number, rng = Math.random): Prompt {
  const pair = pickPair(round, rng);
  const wordLang = chooseWordLang(uiLang, rng);
  return wordLang === 'ko'
    ? { word: pair[0], hint: pair[1], wordLang }
    : { word: pair[1], hint: pair[0], wordLang };
}
