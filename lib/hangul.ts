/**
 * Korean arrives through an IME as composing syllables (ㅈ → 저 → 정), so a
 * plain string prefix check would flag every composition step as a typo.
 * Both target and input are flattened to a jamo sequence and compared there.
 * ASCII passes through untouched, so ko and en share one code path.
 */

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

/** Compound jamo take two keystrokes, so they must split further or a
 *  half-typed compound reads as an error. */
const SPLIT: Record<string, [string, string]> = {
  'ㅘ': ['ㅗ','ㅏ'], 'ㅙ': ['ㅗ','ㅐ'], 'ㅚ': ['ㅗ','ㅣ'],
  'ㅝ': ['ㅜ','ㅓ'], 'ㅞ': ['ㅜ','ㅔ'], 'ㅟ': ['ㅜ','ㅣ'], 'ㅢ': ['ㅡ','ㅣ'],
  'ㄳ': ['ㄱ','ㅅ'], 'ㄵ': ['ㄴ','ㅈ'], 'ㄶ': ['ㄴ','ㅎ'],
  'ㄺ': ['ㄹ','ㄱ'], 'ㄻ': ['ㄹ','ㅁ'], 'ㄼ': ['ㄹ','ㅂ'], 'ㄽ': ['ㄹ','ㅅ'],
  'ㄾ': ['ㄹ','ㅌ'], 'ㄿ': ['ㄹ','ㅍ'], 'ㅀ': ['ㄹ','ㅎ'], 'ㅄ': ['ㅂ','ㅅ'],
};

function push(out: string[], jamo: string) {
  const parts = SPLIT[jamo];
  if (parts) out.push(parts[0], parts[1]);
  else out.push(jamo);
}

export function decompose(str: string): string[] {
  const out: string[] = [];
  for (const ch of str) {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) {
      const i = c - 0xac00;
      push(out, CHO[Math.floor(i / 588)]);
      push(out, JUNG[Math.floor((i % 588) / 28)]);
      const jong = i % 28;
      if (jong) push(out, JONG[jong]);
    } else if (c >= 0x3131 && c <= 0x318e) {
      push(out, ch);
    } else {
      out.push(ch);
    }
  }
  return out;
}

/** How many leading elements of `a` match `b`. */
export function matchLen(a: readonly string[], b: readonly string[]): number {
  let i = 0;
  const n = Math.min(a.length, b.length);
  while (i < n && a[i] === b[i]) i++;
  return i;
}

/** Jamo count at each character boundary, for highlighting finished letters. */
export function cumulative(word: string): number[] {
  const cum = [0];
  let acc = 0;
  for (const ch of word) {
    acc += decompose(ch).length;
    cum.push(acc);
  }
  return cum;
}
