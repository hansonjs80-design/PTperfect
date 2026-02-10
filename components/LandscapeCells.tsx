
import React, { memo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BedState, Preset } from '../types';
import { BedCard } from './BedCard';
import { Trash2, AlertTriangle, Check, Undo2 } from 'lucide-react';
import { useTreatmentContext } from '../contexts/TreatmentContext';

interface LandscapeBedCellProps {
  bed: BedState;
  presets: Preset[];
}

export const LandscapeBedCell: React.FC<LandscapeBedCellProps> = memo(({ bed, presets }) => {
  return (
    <div className="w-full h-full min-h-0">
      <BedCard 
        bed={bed}
        presets={presets}
        isCompact={true}
      />
    </div>
  );
});

export const LandscapeEmptyCell: React.FC = memo(() => {
  const { resetAll, beds, undo, canUndo } = useTreatmentContext();
  const [popup, setPopup] = useState<{ type: 'clear' | 'undo', x: number, y: number } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeBedsCount = beds.filter(b => b.status !== 'IDLE').length;

  const handleOpenPopup = (e: React.MouseEvent, type: 'clear' | 'undo') => {
    if (type === 'clear' && activeBedsCount === 0) return;
    if (type === 'undo' && !canUndo) return;
    setPopup({ type, x: e.clientX, y: e.clientY });
  };

  const handleExecute = async () => {
    if (!popup) return;
    
    if (popup.type === 'clear') {
      resetAll();
      setSuccessMsg("초기화 완료");
    } else {
      await undo();
      setSuccessMsg("되돌리기 완료");
    }

    setTimeout(() => {
      setSuccessMsg(null);
      setPopup(null);
    }, 1200);
  };

  return (
    <div className="w-full h-full flex gap-1.5 lg:gap-3 p-1 lg:p-0 min-h-[120px] sm:min-h-full">
      {/* Undo Button */}
      <button 
        onClick={(e) => handleOpenPopup(e, 'undo')}
        disabled={!canUndo}
        className={`
          flex-1 h-full rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 shadow-sm
          ${canUndo 
            ? 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group shadow-md' 
            : 'bg-slate-50 dark:bg-slate-800/50 opacity-50 cursor-not-allowed'}
        `}
        title="되돌리기 (Ctrl + Z)"
      >
        <div className={`p-2 lg:p-3 rounded-full transition-all ${canUndo ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-500 group-hover:scale-110' : 'bg-slate-200 dark:bg-slate-700 text-gray-400'}`}>
          <Undo2 className="w-5 h-5 lg:w-6 lg:h-6" />
        </div>
        <span className={`font-black text-[10px] lg:text-xs uppercase tracking-widest ${canUndo ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
          되돌리기
        </span>
      </button>

      {/* Clear All Button */}
      <button 
        onClick={(e) => handleOpenPopup(e, 'clear')}
        disabled={activeBedsCount === 0}
        className={`
          flex-1 h-full rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 shadow-sm
          ${activeBedsCount > 0 
            ? 'bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 group shadow-md' 
            : 'bg-slate-50 dark:bg-slate-800/50 opacity-50 cursor-not-allowed'}
        `}
      >
        <div className={`p-2 lg:p-3 rounded-full transition-all ${activeBedsCount > 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-500 group-hover:scale-110' : 'bg-slate-200 dark:bg-slate-700 text-gray-400'}`}>
          <Trash2 className="w-5 h-5 lg:w-6 lg:h-6" />
        </div>
        <span className={`font-black text-[10px] lg:text-xs uppercase tracking-widest ${activeBedsCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
          일괄 비우기
        </span>
      </button>

      {popup && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => !successMsg && setPopup(null)}>
          <div 
            className="absolute w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200 origin-top"
            style={{ 
              top: Math.min(window.innerHeight - 200, Math.max(20, popup.y - 80)),
              left: Math.min(window.innerWidth - 280, Math.max(20, popup.x - 128))
            }}
            onClick={e => e.stopPropagation()}
          >
            {successMsg ? (
              <div className="p-6 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
                <div className={`w-12 h-12 ${popup.type === 'undo' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'} dark:bg-opacity-20 rounded-full flex items-center justify-center`}>
                  <Check className="w-8 h-8" strokeWidth={3} />
                </div>
                <span className="font-black text-slate-800 dark:text-white">{successMsg}</span>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className={`px-4 py-3 ${popup.type === 'undo' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-red-50 border-red-100 text-red-700'} dark:bg-opacity-10 border-b flex items-center gap-2`}>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-black text-xs">
                    {popup.type === 'undo' ? '이전 상태로 되돌릴까요?' : '정말 모두 비울까요?'}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                    {popup.type === 'undo' 
                      ? '방금 수행한 삭제나 비우기 작업이\n취소되고 데이터가 복구됩니다.' 
                      : '작동 중인 모든 타이머가 종료되며\n환자 정보가 배드에서 삭제됩니다.'}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setPopup(null)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-gray-200">취소</button>
                    <button 
                      onClick={handleExecute}
                      className={`flex-1 py-2.5 ${popup.type === 'undo' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700'} text-white rounded-xl font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1`}
                    >
                      {popup.type === 'undo' ? <Undo2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                      확인
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
