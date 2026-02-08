
import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // 브라우저 기본 설치 프롬프트 무시
      e.preventDefault();
      // 이벤트 저장
      setDeferredPrompt(e);
      // 설치 가능 상태로 변경
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    
    // 설치 프롬프트 실행
    deferredPrompt.prompt();
    
    // 유저 응답 대기
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    // 한 번 사용하면 초기화
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return { isInstallable, install };
};
