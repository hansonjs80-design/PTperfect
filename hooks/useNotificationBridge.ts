import { useEffect } from 'react';

type ActionHandler = (bedId: number) => void;

/**
 * Service Worker의 메시지 이벤트를 수신하여 앱의 액션(예: 다음 단계)을 트리거합니다.
 */
export const useNotificationBridge = (onNextStep: ActionHandler) => {
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      // sw.js에서 보낸 'NEXT_STEP' 액션 처리
      if (event.data && event.data.type === 'NEXT_STEP' && event.data.bedId) {
        console.log(`[NotificationBridge] Received NEXT_STEP action for Bed ${event.data.bedId}`);
        onNextStep(event.data.bedId);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [onNextStep]);
};