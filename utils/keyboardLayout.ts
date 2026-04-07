const KOREAN_TO_ENGLISH_KEY_MAP: Record<string, string> = {
  'ㅂ': 'q', 'ㅃ': 'Q', 'ㅈ': 'w', 'ㅉ': 'W', 'ㄷ': 'e', 'ㄸ': 'E', 'ㄱ': 'r', 'ㄲ': 'R', 'ㅅ': 't', 'ㅆ': 'T',
  'ㅛ': 'y', 'ㅕ': 'u', 'ㅑ': 'i', 'ㅐ': 'o', 'ㅒ': 'O', 'ㅔ': 'p', 'ㅖ': 'P',
  'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd', 'ㄹ': 'f', 'ㅎ': 'g', 'ㅗ': 'h', 'ㅓ': 'j', 'ㅏ': 'k', 'ㅣ': 'l',
  'ㅋ': 'z', 'ㅌ': 'x', 'ㅊ': 'c', 'ㅍ': 'v', 'ㅠ': 'b', 'ㅜ': 'n', 'ㅡ': 'm'
};
const ENGLISH_TO_KOREAN_KEY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(KOREAN_TO_ENGLISH_KEY_MAP).map(([korean, english]) => [english, korean])
);
const HANGUL_CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const HANGUL_JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const HANGUL_JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const COMPLEX_VOWEL_MAP: Record<string, string> = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
const COMPLEX_FINAL_MAP: Record<string, string> = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
const CHO_INDEX = new Map<string, number>(HANGUL_CHO.map((char, index) => [char, index]));
const JUNG_INDEX = new Map<string, number>(HANGUL_JUNG.map((char, index) => [char, index]));
const JONG_INDEX = new Map<string, number>(HANGUL_JONG.map((char, index) => [char, index]));

export const normalizeEnglishKeyInput = (raw: string): string => {
  if (!raw) return '';
  return Array.from(raw)
    .map((char) => KOREAN_TO_ENGLISH_KEY_MAP[char] ?? char)
    .join('');
};

export const normalizeUpperEnglishKeyInput = (raw: string): string => {
  return normalizeEnglishKeyInput(raw).toUpperCase();
};

export const normalizeKoreanKeyInput = (raw: string): string => {
  if (!raw) return '';
  return Array.from(raw)
    .map((char) => ENGLISH_TO_KOREAN_KEY_MAP[char] ?? char)
    .join('');
};

export const composeHangulSyllables = (value: string): string => {
  const chars = Array.from(value);
  let result = '';

  const mergeTrailingFinalIntoPrevious = (currentIndex: number) => {
    const current = chars[currentIndex];
    if (!CHO_INDEX.has(current) || !result) return null;

    const lastChar = result[result.length - 1];
    const lastCode = lastChar.charCodeAt(0);
    if (lastCode < 0xac00 || lastCode > 0xd7a3) return null;

    const syllableIndex = lastCode - 0xac00;
    const cho = Math.floor(syllableIndex / 588);
    const jung = Math.floor((syllableIndex % 588) / 28);
    const jong = syllableIndex % 28;
    if (jong !== 0) return null;

    const next = chars[currentIndex + 1];
    const nextStartsVowel = !!next && (JUNG_INDEX.has(next) || !!COMPLEX_VOWEL_MAP[`${next}${chars[currentIndex + 2] || ''}`]);
    if (nextStartsVowel) return null;

    let mergedFinal = current;
    let consumed = 1;
    const after = chars[currentIndex + 1];
    const complexFinal = current && after ? COMPLEX_FINAL_MAP[`${current}${after}`] : undefined;
    const afterStartsVowel = !!chars[currentIndex + 2] && (JUNG_INDEX.has(chars[currentIndex + 2]) || !!COMPLEX_VOWEL_MAP[`${chars[currentIndex + 2]}${chars[currentIndex + 3] || ''}`]);
    if (complexFinal && !afterStartsVowel) {
      mergedFinal = complexFinal;
      consumed = 2;
    }

    const jongIndex = JONG_INDEX.get(mergedFinal);
    if (jongIndex == null) return null;

    result = result.slice(0, -1) + String.fromCharCode(0xac00 + cho * 588 + jung * 28 + jongIndex);
    return consumed;
  };

  const readVowel = (start: number) => {
    const first = chars[start];
    const next = chars[start + 1];
    if (first && next) {
      const complex = COMPLEX_VOWEL_MAP[`${first}${next}`];
      if (complex) return { vowel: complex, length: 2 };
    }
    return { vowel: first, length: 1 };
  };

  for (let i = 0; i < chars.length;) {
    const current = chars[i];
    const mergedTrailingFinalLength = mergeTrailingFinalIntoPrevious(i);
    if (mergedTrailingFinalLength) {
      i += mergedTrailingFinalLength;
      continue;
    }

    const choIndex = CHO_INDEX.get(current);
    const next = chars[i + 1];
    const nextIsVowel = next ? JUNG_INDEX.has(next) || !!COMPLEX_VOWEL_MAP[`${next}${chars[i + 2] || ''}`] : false;

    if (choIndex == null || !nextIsVowel) {
      result += current;
      i += 1;
      continue;
    }

    const { vowel, length: vowelLength } = readVowel(i + 1);
    const jungIndex = JUNG_INDEX.get(vowel);
    if (jungIndex == null) {
      result += current;
      i += 1;
      continue;
    }

    let consumed = 1 + vowelLength;
    let jong = '';
    const final1 = chars[i + consumed];
    const final2 = chars[i + consumed + 1];
    const final1IsConsonant = !!final1 && CHO_INDEX.has(final1);
    const final2StartsVowel = !!final2 && (JUNG_INDEX.has(final2) || !!COMPLEX_VOWEL_MAP[`${final2}${chars[i + consumed + 2] || ''}`]);

    if (final1IsConsonant && !final2StartsVowel) {
      const complexFinal = final1 && final2 ? COMPLEX_FINAL_MAP[`${final1}${final2}`] : undefined;
      const final3StartsVowel = !!chars[i + consumed + 2] && (JUNG_INDEX.has(chars[i + consumed + 2]) || !!COMPLEX_VOWEL_MAP[`${chars[i + consumed + 2]}${chars[i + consumed + 3] || ''}`]);
      if (complexFinal && !final3StartsVowel) {
        jong = complexFinal;
        consumed += 2;
      } else {
        jong = final1 || '';
        consumed += 1;
      }
    }

    const jongIndex = JONG_INDEX.get(jong) ?? 0;
    result += String.fromCharCode(0xac00 + choIndex * 588 + jungIndex * 28 + jongIndex);
    i += consumed;
  }

  return result;
};
