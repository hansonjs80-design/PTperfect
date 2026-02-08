
import { useEffect, useRef } from 'react';

export const useWakeLock = (isActive: boolean) => {
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isActive) {
        try {
          if (!wakeLock.current) {
            wakeLock.current = await navigator.wakeLock.request('screen');
            // console.log('Screen Wake Lock active');
          }
        } catch (err: any) {
          // Gracefully handle 'NotAllowedError' (e.g., battery saver mode, restricted permissions policy)
          if (err.name !== 'NotAllowedError') {
            console.warn('Wake Lock request failed:', err);
          }
        }
      } else if (!isActive && wakeLock.current) {
        wakeLock.current.release()
          .then(() => {
            wakeLock.current = null;
            // console.log('Screen Wake Lock released');
          })
          .catch((e) => console.error(e));
      }
    };

    requestWakeLock();

    // Re-request lock when visibility changes (e.g., tab switch, unlock)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock.current) {
        wakeLock.current.release().catch(() => {});
        wakeLock.current = null;
      }
    };
  }, [isActive]);
};
