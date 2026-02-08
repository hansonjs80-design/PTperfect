
import React, { useState, useEffect } from 'react';
import { Volume2, Play, Bell, AlertTriangle, Zap, CheckCircle2, Mic } from 'lucide-react';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { playAlarmPattern } from '../utils/alarm';

export const SettingsPreferencesTab: React.FC = () => {
  const { isSoundEnabled, toggleSound, isBackgroundKeepAlive, toggleBackgroundKeepAlive } = useTreatmentContext();
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert("이 브라우저는 시스템 알림을 지원하지 않습니다.");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      playAlarmPattern(); // Test immediately
    }
  };

  const handleTestSound = () => {
    playAlarmPattern();
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
      
      {/* Sound Card */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
           <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg text-pink-600 dark:text-pink-400">
              <Volume2 className="w-5 h-5" />
           </div>
           <h3 className="font-black text-slate-800 dark:text-white text-lg">사운드 알림</h3>
        </div>

        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">치료 종료 알림음</span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              타이머 종료 시 "삐-삐-삐" 반복음과 진동
            </span>
          </div>
          <button 
            onClick={toggleSound}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              isSoundEnabled ? 'bg-pink-500' : 'bg-slate-200 dark:bg-slate-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
              isSoundEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <button 
             onClick={handleTestSound}
             className="w-full text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 py-3 rounded-xl transition-colors active:scale-95"
           >
             <Play className="w-3.5 h-3.5 fill-current" />
             알림음 테스트 (Sound Check)
        </button>
      </div>

      {/* System Settings Card */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
           <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
              <Zap className="w-5 h-5" />
           </div>
           <h3 className="font-black text-slate-800 dark:text-white text-lg">시스템 설정</h3>
        </div>

        <div className="space-y-4">
            {/* Background Mode */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col pr-4">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    백그라운드 실행 유지
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 leading-snug">
                    화면 꺼짐 방지 및 백그라운드 타이머 작동을 위해 무음 오디오를 재생합니다.
                    </span>
                </div>
                <button 
                    onClick={toggleBackgroundKeepAlive}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                    isBackgroundKeepAlive ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-600'
                    }`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    isBackgroundKeepAlive ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                </button>
            </div>

            {/* Notification Permission */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5" /> 시스템 알림 권한
                    </span>
                    {permission === 'granted' ? (
                        <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> 허용됨
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                            미허용
                        </span>
                    )}
                </div>
                
                {permission !== 'granted' && (
                    <button 
                    onClick={handleRequestPermission}
                    className="w-full mt-2 py-2.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 transition-all shadow-md"
                    >
                    권한 요청하기
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <strong>iOS(아이폰) 주의사항:</strong> 브라우저 정책상 <strong>'홈 화면에 추가'</strong>를 통해 설치된 앱에서만 백그라운드 알림 및 진동이 정상 작동합니다. 반드시 무음 모드를 해제해주세요.
        </p>
      </div>
    </div>
  );
};
