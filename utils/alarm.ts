
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

  // 2. TTS Audio (Web Speech API) - replaces the old AudioContext beep
  // Only play if NOT silent
  if (!isSilent && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      // ★ 첫 음절 잘림 방지: 짧은 무음 utterance를 먼저 재생하여 오디오 파이프라인을 활성화
      // 일부 디바이스/브라우저에서 speechSynthesis가 처음 시작될 때 오디오 출력이 지연됨
      window.speechSynthesis.cancel(); // 이전 큐 정리
      const warmup = new SpeechSynthesisUtterance(' ');
      warmup.lang = 'ko-KR';
      warmup.volume = 0.01; // 거의 무음
      warmup.rate = 2.0; // 빠르게 끝내기
      window.speechSynthesis.speak(warmup);

      const bedLabel = bedId === 11 ? '견인치료기' : `${toSinoKorean(bedId!)}번 배드`;
      const currentLabel = treatmentName ? ` ${treatmentName}` : '';

      // 앞에 쉼표를 추가하여 자연스러운 pause 확보 (첫 음절 보호)
      let message = `, ${bedLabel}${currentLabel} 종료되었습니다.`;
      if (nextTreatmentName) {
        message += ` 다음 치료는 ${nextTreatmentName} 입니다.`;
      }

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Queue alerts sequentially for beds ending at similar times
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("TTS playback failed", e);
    }
  }

  // 3. System Notification (Native Sound/Vibration - iOS & Android PWA)
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
