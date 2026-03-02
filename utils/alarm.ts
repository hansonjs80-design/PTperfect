// 알람, 진동, 시스템 알림 관련 로직 분리

// 숫자를 한자어 읽기로 변환 (1→일, 2→이, ... 10→십)
const toSinoKorean = (num: number): string => {
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  if (num <= 0) return String(num);
  if (num < 10) return digits[num];
  if (num === 10) return '십';
  if (num < 20) return '십' + digits[num % 10];
  return String(num); // fallback
};


const playBeepPattern = () => {
  if (typeof window === 'undefined') return;

  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const pattern: Array<[number, number]> = [
      [0.00, 0.22],
      [0.45, 0.22],
      [0.90, 0.22],
    ];

    pattern.forEach(([startOffset, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now + startOffset);

      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + dur + 0.02);
    });

    const closeAfter = 1800;
    window.setTimeout(() => {
      if (ctx.state !== 'closed') void ctx.close();
    }, closeAfter);
  } catch (e) {
    console.error('Alarm beep playback failed', e);
  }
};

// TTS가 겹치는 경우 잘림/중단이 발생하므로 전역 직렬 큐로 처리
let ttsQueue: Promise<void> = Promise.resolve();

const speakSequentially = (message: string): Promise<void> => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    try {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const finish = () => resolve();
      utterance.onend = finish;
      utterance.onerror = finish;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('TTS playback failed', e);
      resolve();
    }
  });
};

export const playAlarmPattern = async (
  bedId?: number,
  treatmentName?: string,
  nextTreatmentName?: string,
  isSilent: boolean = false
) => {
  // Mobile/Desktop Vibration Pattern (Total approx 5 seconds)
  // 1s on, 0.5s off, 1s on, 0.5s off, 1s on, 0.5s off, 0.5s on
  const VIBRATION_PATTERN = [1000, 500, 1000, 500, 1000, 500, 500];

  // 1. Vibration (Browser API - Android/Desktop)
  // Only play if NOT silent
  if (!isSilent) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(VIBRATION_PATTERN);
    }
  }

  // 2. Beep Audio (Web Audio API)
  if (!isSilent) {
    playBeepPattern();
  }

  // 3. TTS Audio (Web Speech API)
  // 겹치는 종료 알림도 순차적으로 모두 재생되도록 cancel 없이 직렬 큐 처리
  if (!isSilent) {
    const bedLabel = bedId === 11 ? '견인치료기' : `${toSinoKorean(bedId!)}번 배드`;
    const currentLabel = treatmentName ? ` ${treatmentName} 치료` : ' 치료';

    let message = `${bedLabel}${currentLabel} 종료되었습니다.`;
    if (nextTreatmentName) {
      message += ` 다음 치료는 ${nextTreatmentName} 입니다.`;
    } else {
      message += ' 다음 치료가 없습니다.';
    }

    ttsQueue = ttsQueue.then(() => speakSequentially(message));
  }

  // 4. System Notification (Native Sound/Vibration - iOS & Android PWA)
  // Always trigger notification for visual cue, but suppress sound/vibrate if silent
  // 데스크탑 모드에서는 알림 창(Notification)을 띄우지 않음
  const isDesktop = typeof navigator !== 'undefined' && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (!isDesktop && 'Notification' in window && Notification.permission === 'granted') {
    const bedLabel = bedId === 11 ? '견인치료' : `${bedId}번`;
    const stepLabel = treatmentName ? ` ${treatmentName}` : '';

    let title = bedId ? `${bedLabel}${stepLabel} 종료` : 'PhysioTrack 알림 테스트';
    let body = bedId ? '치료 시간이 종료되었습니다.' : '네이티브 알림(소리/진동) 테스트입니다.';

    if (nextTreatmentName) {
      body += ` 다음 치료는 ${nextTreatmentName} 입니다.`;
    }

    // Native vibration control via Notification API option
    const notificationVibrate = isSilent ? [] : VIBRATION_PATTERN;

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            body: body,
            icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063176.png',
            vibrate: notificationVibrate,
            silent: isSilent, // Suppress system sound if silent is true
            tag: bedId ? `bed-${bedId}` : 'test-alarm',
            renotify: true,
            requireInteraction: true,
            data: { bedId },
            actions: bedId ? [
              { action: 'next-step', title: '다음 치료 진행' }
            ] : []
          } as any);
          return;
        }
      }

      // Fallback for non-SW environments
      new Notification(title, {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063176.png',
        silent: isSilent,
        // @ts-ignore
        vibrate: notificationVibrate
      });
    } catch (e) {
      console.error("Notification failed", e);
    }
  }
};
