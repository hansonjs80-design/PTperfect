
import React, { useState } from 'react';
import { AlertTriangle, Check, Copy, RotateCcw, Database } from 'lucide-react';
import { SUPABASE_INIT_SQL } from '../../utils/sqlConstants';

interface MaintenanceToolsProps {
  onResetAllBeds: () => void;
  onClosePanel: () => void;
}

export const MaintenanceTools: React.FC<MaintenanceToolsProps> = ({ onResetAllBeds, onClosePanel }) => {
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_INIT_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeResetAll = () => {
    onResetAllBeds();
    onClosePanel();
    setShowResetAllConfirm(false);
  };

  return (
    <div className="space-y-4">
      
      {/* SQL Tools Card */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
           <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Database className="w-5 h-5" />
           </div>
           <h3 className="font-black text-slate-800 dark:text-white text-lg">데이터베이스 관리</h3>
        </div>

        {!showSql ? (
          <button 
            onClick={() => setShowSql(true)}
            className="w-full text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 py-3 rounded-xl transition-colors border border-indigo-100 dark:border-indigo-800/50"
          >
            + 초기화 SQL 코드 보기 (Reset Script)
          </button>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-2 p-3 bg-indigo-50 dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-indigo-800 dark:text-indigo-300 font-bold flex items-center gap-1 uppercase tracking-wider">
                <AlertTriangle className="w-3 h-3" />
                Supabase SQL Editor
              </span>
              <button onClick={handleCopySql} className="text-[10px] flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-indigo-200 dark:border-slate-600 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm active:scale-95 transition-transform">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="bg-slate-800 text-slate-300 p-3 rounded-lg text-[10px] overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed shadow-inner max-h-48 overflow-y-auto border border-slate-700 custom-scrollbar">
              {SUPABASE_INIT_SQL}
            </pre>
            <button 
              onClick={() => setShowSql(false)}
              className="mt-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-full text-center py-1"
            >
              닫기
            </button>
          </div>
        )}
      </div>

      {/* Emergency Reset Card */}
      <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-900/30">
        <div className="flex items-center gap-2 mb-3">
           <AlertTriangle className="w-5 h-5 text-red-500" />
           <h3 className="font-black text-red-700 dark:text-red-400 text-lg">긴급 초기화</h3>
        </div>
        
        {!showResetAllConfirm ? (
          <button 
            onClick={() => setShowResetAllConfirm(true)}
            className="flex items-center justify-center w-full px-4 py-3 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800 rounded-xl transition-colors shadow-sm active:scale-[0.98] font-bold text-xs"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            모든 배드 상태 강제 초기화
          </button>
        ) : (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-red-200 dark:border-red-900 animate-in fade-in zoom-in-95 duration-200">
             <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-3 text-center leading-relaxed">
                현재 작동 중인 모든 타이머와 배드 상태가<br/>즉시 삭제됩니다. 진행하시겠습니까?
             </p>
             <div className="flex gap-2">
                <button onClick={executeResetAll} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 shadow-md text-xs">초기화 실행</button>
                <button onClick={() => setShowResetAllConfirm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-lg font-bold hover:bg-slate-200 text-xs">취소</button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
