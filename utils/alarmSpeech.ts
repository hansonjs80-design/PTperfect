// 숫자를 한자어 읽기로 변환 (1→일, 2→이, ... 10→십)
export const toSinoKorean = (num: number): string => {
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  if (num <= 0) return String(num);
  if (num < 10) return digits[num];
  if (num === 10) return '십';
  if (num < 20) return '십' + digits[num % 10];
  return String(num);
};

export const MOBILE_VIBRATION_PATTERN = [1000, 500, 1000, 500, 1000, 500, 500];

let ttsQueue: Promise<void> = Promise.resolve();

const speakSequentially = (message: string): Promise<void> => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };

    const safetyTimer = window.setTimeout(finish, 8000);

    try {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        window.clearTimeout(safetyTimer);
        finish();
      };
      utterance.onerror = () => {
        window.clearTimeout(safetyTimer);
        finish();
      };

      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      window.clearTimeout(safetyTimer);
      console.error('TTS playback failed', e);
      finish();
    }
  });
};

export const queueGuideSpeech = (message: string, repeatCount: number = 1) => {
  const repeats = Math.max(1, Math.floor(repeatCount));

  for (let i = 0; i < repeats; i += 1) {
    ttsQueue = ttsQueue
      .catch(() => {
        // Keep queue alive even if a previous unexpected error occurred.
      })
      .then(() => speakSequentially(message));
  }
};
