const KOREAN_TO_ENGLISH_KEY_MAP: Record<string, string> = {
  'ㅂ': 'q', 'ㅃ': 'Q', 'ㅈ': 'w', 'ㅉ': 'W', 'ㄷ': 'e', 'ㄸ': 'E', 'ㄱ': 'r', 'ㄲ': 'R', 'ㅅ': 't', 'ㅆ': 'T',
  'ㅛ': 'y', 'ㅕ': 'u', 'ㅑ': 'i', 'ㅐ': 'o', 'ㅒ': 'O', 'ㅔ': 'p', 'ㅖ': 'P',
  'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd', 'ㄹ': 'f', 'ㅎ': 'g', 'ㅗ': 'h', 'ㅓ': 'j', 'ㅏ': 'k', 'ㅣ': 'l',
  'ㅋ': 'z', 'ㅌ': 'x', 'ㅊ': 'c', 'ㅍ': 'v', 'ㅠ': 'b', 'ㅜ': 'n', 'ㅡ': 'm'
};
const ENGLISH_TO_KOREAN_KEY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(KOREAN_TO_ENGLISH_KEY_MAP).map(([korean, english]) => [english, korean])
);

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
