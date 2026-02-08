import { useEffect, useRef } from 'react';

export const useWakeLock = (isActive: boolean) => {
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isActive) {
        try {
          if (!wakeLock.current) {
            wakeLock.current = await navigator.wakeLock.request('screen');
            console.log('Screen Wake Lock active');
          }
        } catch (err) {
          console.error('Wake Lock request failed:', err);
        }
      } else if (!isActive && wakeLock.current) {
        wakeLock.current.release()
          .then(() => {
            wakeLock.current = null;
            console.log('Screen Wake Lock released');
          })
          .catch((e) => console.error(e));
      }
    };

    requestWakeLock();

    // 탭을 다시 활성화했을 때 Wake Lock이 풀려있을 수 있으므로 재요청
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock.current) {
        wakeLock.current.release().catch((e) => console.error(e));
        wakeLock.current = null;
      }
    };
  }, [isActive]);
};