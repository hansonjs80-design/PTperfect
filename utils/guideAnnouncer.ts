import { queueGuideSpeech } from './alarmSpeech';

interface GuideMessageParams {
  bedId?: number;
  treatmentName?: string;
  nextTreatmentName?: string;
}

export const createGuideMessage = ({ bedId, treatmentName, nextTreatmentName }: GuideMessageParams): string => {
  const hasBedId = typeof bedId === 'number' && !Number.isNaN(bedId);
  const bedLabel = hasBedId ? `${bedId}번 배드` : '해당 배드';
  const currentLabel = treatmentName && treatmentName.trim() !== '' ? treatmentName.trim() : '현재 치료';

  let message = `${currentLabel}가(이) ${bedLabel}에서 종료되었습니다.`;
  if (nextTreatmentName && nextTreatmentName.trim() !== '') {
    message += ` 다음치료는 ${nextTreatmentName.trim()} 입니다.`;
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
