import { queueGuideSpeech } from './alarmSpeech';


const KOREAN_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const KOREAN_UNITS = ['', '십', '백', '천'];

const toKoreanNumber = (value: number): string => {
  if (!Number.isFinite(value)) return String(value);
  const integer = Math.trunc(Math.abs(value));
  if (integer === 0) return '영';

  const digits = String(integer).split('').map((char) => Number(char));
  const len = digits.length;

  return digits
    .map((digit, idx) => {
      if (digit === 0) return '';
      const unitIdx = len - idx - 1;
      const unit = KOREAN_UNITS[unitIdx] ?? '';
      if (digit === 1 && unit) return unit;
      return `${KOREAN_DIGITS[digit]}${unit}`;
    })
    .join('');
};

interface GuideMessageParams {
  bedId?: number;
  treatmentName?: string;
  nextTreatmentName?: string;
}

export const createGuideMessage = ({ bedId, treatmentName, nextTreatmentName }: GuideMessageParams): string => {
  const hasBedId = typeof bedId === 'number' && !Number.isNaN(bedId);
  const bedNo = hasBedId ? `${toKoreanNumber(bedId)}번` : '해당';
  const bedLabel = hasBedId ? `${toKoreanNumber(bedId)}번 배드` : '해당 배드';
  const currentLabel = treatmentName && treatmentName.trim() !== '' ? treatmentName.trim() : '현재';

  let message = `${bedNo}, ${bedLabel}에서 ${currentLabel}치료가 종료 되었습니다.`;
  if (nextTreatmentName && nextTreatmentName.trim() !== '') {
    message += ` 다음치료는 ${nextTreatmentName.trim()} 치료입니다.`;
  } else {
    message += ' 모든 치료가 종료 되었습니다.';
  }

  return message;
};

export const announceGuide = (params: GuideMessageParams) => {
  const message = createGuideMessage(params);
  queueGuideSpeech(message);
};


export const shouldAnnounceGuide = (isSilent: boolean): boolean => {
  if (isSilent) return false;
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
};
