import { queueGuideSpeech, toSinoKorean } from './alarmSpeech';

interface GuideMessageParams {
  bedId?: number;
  treatmentName?: string;
  nextTreatmentName?: string;
}

export const createGuideMessage = ({ bedId, treatmentName, nextTreatmentName }: GuideMessageParams): string => {
  const hasBedId = typeof bedId === 'number' && !Number.isNaN(bedId);
  const bedLabel = hasBedId
    ? (bedId === 11 ? '견인치료기' : `${toSinoKorean(bedId)}번 배드`)
    : '치료';
  const currentLabel = treatmentName ? ` ${treatmentName} 치료` : ' 치료';

  let message = `${bedLabel}${currentLabel} 종료되었습니다.`;
  if (nextTreatmentName) {
    message += ` 다음 치료는 ${nextTreatmentName} 입니다.`;
  } else {
    message += ' 다음 치료가 없습니다.';
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
