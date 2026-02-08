
import React, { useState } from 'react';
import { Wifi, RefreshCw, Link, ShieldCheck } from 'lucide-react';
import { isOnlineMode, testSupabaseConnection, saveSupabaseConfig, clearSupabaseConfig } from '../../lib/supabase';

const DEFAULT_SB_URL = 'https://ebiirfwjucfhdrpinykr.supabase.co';
const DEFAULT_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaWlyZndqdWNmaGRycGlueWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTg1ODQsImV4cCI6MjA4NTI5NDU4NH0.gEj7gIdfsNCo71WYj1qDGkfCizAcpLEfLS2dVyqcZf4';

export const ConnectionConfig: React.FC = () => {
  const [sbUrl, setSbUrl] = useState(window.localStorage.getItem('sb_url') || DEFAULT_SB_URL);
  const [sbKey, setSbKey] = useState(window.localStorage.getItem('sb_key') || DEFAULT_SB_KEY);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isConnected = isOnlineMode();

  const handleTestConnection = async () => {
    setTestStatus('testing');
    const success = await testSupabaseConnection(sbUrl, sbKey);
    setTestStatus(success ? 'success' : 'error');
  };

  const handleSaveConfig = () => {
    if (sbUrl && sbKey) {
      setShowSaveConfirm(true);
    } else {
      alert('URL과 Key를 모두 입력해주세요.');
    }
  };

  const executeSaveConfig = () => {
    saveSupabaseConfig(sbUrl, sbKey);
    setShowSaveConfirm(false);
  };

  const executeClearConfig = () => {
    clearSupabaseConfig();
    setShowClearConfirm(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Link className="w-5 h-5" />
           </div>
           <div>
             <h3 className="font-black text-slate-800 dark:text-white text-lg leading-none">Supabase 연동</h3>
             <span className={`text-[10px] font-bold ${isConnected ? 'text-emerald-500' : 'text-slate-400'}`}>
               {isConnected ? '● Connected' : '○ Offline Mode'}
             </span>
           </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">Project URL</label>
          <input 
            type="text" 
            value={sbUrl}
            onChange={e => setSbUrl(e.target.value)}
            placeholder="https://your-project.supabase.co"
            className="w-full p-3 text-xs font-medium border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">Anon Key</label>
          <input 
            type="password" 
            value={sbKey}
            onChange={e => setSbKey(e.target.value)}
            placeholder="your-anon-key"
            className="w-full p-3 text-xs font-medium border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 pt-1">
          <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing' || !sbUrl || !sbKey}
              className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  testStatus === 'success' 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                    : testStatus === 'error'
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
          >
              {testStatus === 'testing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              {testStatus === 'success' ? '연결 성공' : testStatus === 'error' ? '연결 실패' : '연결 테스트'}
          </button>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-2">
           {!showSaveConfirm ? (
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveConfig}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200 dark:shadow-none transition-all active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4" /> 
                  설정 저장 및 적용
                </button>
                {isConnected && (
                    <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs rounded-xl font-bold transition-colors"
                    >
                    초기화
                    </button>
                )}
              </div>
           ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 border border-slate-200 dark:border-slate-700">
                 <p className="text-[11px] text-center font-bold text-slate-600 dark:text-slate-300">설정을 저장하고 페이지를 새로고침 합니다.</p>
                 <div className="flex gap-2">
                    <button onClick={executeSaveConfig} className="flex-1 bg-brand-600 text-white text-xs py-2 rounded-lg font-bold hover:bg-brand-700 shadow-md">확인</button>
                    <button onClick={() => setShowSaveConfirm(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs py-2 rounded-lg font-bold hover:bg-slate-50">취소</button>
                 </div>
              </div>
           )}

           {showClearConfirm && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 border border-red-100 dark:border-red-900/50">
                 <p className="text-[11px] text-center font-bold text-red-600 dark:text-red-300">연동 설정을 모두 지우고 기본값으로 복구합니까?</p>
                 <div className="flex gap-2">
                    <button onClick={executeClearConfig} className="flex-1 bg-red-600 text-white text-xs py-2 rounded-lg font-bold hover:bg-red-700 shadow-md">초기화</button>
                    <button onClick={() => setShowClearConfirm(false)} className="flex-1 bg-white border border-red-100 text-slate-600 text-xs py-2 rounded-lg font-bold hover:bg-slate-50">취소</button>
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
