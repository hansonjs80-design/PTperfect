// 알람, 진동, 시스템 알림 관련 로직 분리
import { MOBILE_VIBRATION_PATTERN } from './alarmSpeech';
import { announceGuide } from './guideAnnouncer';

export const playAlarmPattern = async (
  bedId?: number,
  treatmentName?: string,
  nextTreatmentName?: string,
  isSilent: boolean = false
) => {
  // 1. Vibration (Browser API - Android/Desktop)
  // Only play if NOT silent
  if (!isSilent) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(MOBILE_VIBRATION_PATTERN);
    }
  }

  // 2. TTS Audio (Web Speech API)
  // 겹치는 종료 알림도 순차적으로 모두 재생되도록 cancel 없이 직렬 큐 처리
  announceGuide({ bedId, treatmentName, nextTreatmentName });

  // 3. System Notification (visual only, no notification sound)
  // 데스크탑 모드에서는 알림 창(Notification)을 띄우지 않음
  const isDesktop = typeof navigator !== 'undefined' && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (!isDesktop && 'Notification' in window && Notification.permission === 'granted') {
    const bedLabel = bedId === 11 ? '견인치료' : `${bedId}번`;
    const stepLabel = treatmentName ? ` ${treatmentName}` : '';

    const title = bedId ? `${bedLabel}${stepLabel} 종료` : 'PhysioTrack 알림 테스트';
    let body = bedId ? '치료 시간이 종료되었습니다.' : '네이티브 알림(소리/진동) 테스트입니다.';

    if (nextTreatmentName) {
      body += ` 다음 치료는 ${nextTreatmentName} 입니다.`;
    }

    const notificationVibrate: number[] = [];

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            body,
            icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063176.png',
            vibrate: notificationVibrate,
            silent: true,
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
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063176.png',
        silent: true,
        // @ts-ignore
        vibrate: notificationVibrate
      });
    } catch (e) {
      console.error('Notification failed', e);
    }
  }
};
