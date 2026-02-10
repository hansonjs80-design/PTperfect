
import React, { memo, useState, useRef } from 'react';
import { TreatmentStep } from '../types';
import { getStepLabel } from '../utils/bedUtils';
import { getStepColor } from '../utils/styleUtils';
import { PopupEditor } from './common/PopupEditor';
import { ArrowRightLeft } from 'lucide-react';

interface BedStepColumnProps {
  step: TreatmentStep;
  index: number;
  isActive: boolean;
  isPast: boolean;
  isCompleted: boolean;
  isSelectedForSwap: boolean;
  memo: string | undefined;
  bedId: number;
  onSwapRequest?: (id: number, idx: number) => void;
  onUpdateMemo?: (id: number, idx: number, val: string | null) => void;
}

export const BedStepColumn: React.FC<BedStepColumnProps> = memo(({
  step,
  index,
  isActive,
  isPast,
  isCompleted,
  isSelectedForSwap,
  memo,
  bedId,
  onSwapRequest,
  onUpdateMemo
}) => {
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const colorClass = getStepColor(step, isActive, isPast, false, isCompleted);
  const lastMemoClickRef = useRef<number>(0);
  const lastSwapClickRef = useRef<number>(0);

  const handleMemoDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onUpdateMemo) return;
    setIsEditingMemo(true);
  };

  const handleMemoTouchClick = (e: React.MouseEvent) => {
    if (window.matchMedia('(pointer: coarse)').matches) {
        const now = Date.now();
        if (now - lastMemoClickRef.current < 350) {
            e.preventDefault();
            e.stopPropagation();
            if (onUpdateMemo) setIsEditingMemo(true);
            lastMemoClickRef.current = 0;
        } else {
            lastMemoClickRef.current = now;
        }
    }
  };

  const handleSwapInteraction = (e: React.MouseEvent) => {
    // 1. Desktop & Tablet (Width >= 768px) -> Single Click
    if (window.innerWidth >= 768) {
        e.preventDefault();
        e.stopPropagation();
        onSwapRequest && onSwapRequest(bedId, index);
        return;
    }

    // 2. Mobile (Width < 768px) -> Double Tap
    const now = Date.now();
    if (now - lastSwapClickRef.current < 350) {
        e.preventDefault();
        e.stopPropagation();
        onSwapRequest && onSwapRequest(bedId, index);
        lastSwapClickRef.current = 0;
    } else {
        lastSwapClickRef.current = now;
        // Allow bubbling for first tap on mobile (to support parent handlers if any)
    }
  };

  const handleMemoSave = (val: string) => {
    if (onUpdateMemo) {
      onUpdateMemo(bedId, index, val === "" ? null : val);
    }
    setIsEditingMemo(false);
  };

  return (
    <>
      <div 
        className={`
          flex-1 flex flex-col h-full min-w-0 group/col relative transition-all duration-300
          ${isActive ? 'z-10 shadow-md transform scale-[1.02] rounded-lg my-[-1px]' : ''}
          ${isSelectedForSwap ? 'z-20 scale-[0.98]' : ''}
        `}
        onClick={handleSwapInteraction}
      >
        {/* Step Visual Block */}
        <div className={`
            flex-1 flex flex-col items-center justify-center p-1 sm:p-1.5 relative overflow-hidden transition-all duration-200 
            ${colorClass}
            ${isSelectedForSwap ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 rounded-md' : ''}
        `}>
            <span className={`font-black text-base xs:text-lg sm:text-xl lg:text-2xl leading-none text-center whitespace-nowrap px-0.5 ${isActive ? 'scale-110 drop-shadow-sm' : 'opacity-90'}`}>
              {getStepLabel(step)}
            </span>
            
            {isActive && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />}
            
            {isSelectedForSwap && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 dark:bg-slate-900/60 backdrop-blur-[1px] animate-in fade-in duration-200">
                 <div className="bg-indigo-600 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-xl shadow-indigo-500/30 flex items-center justify-center animate-in zoom-in duration-200">
                   <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                 </div>
              </div>
            )}
        </div>

        {/* Memo Area */}
        <div 
          className={`
            h-[18px] sm:h-[26px] flex items-center justify-center px-1 cursor-pointer transition-colors select-none border-t border-black/5 dark:border-white/5
            ${isActive 
               ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200' 
               : 'bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'
            }
          `}
          onDoubleClick={handleMemoDoubleClick}
          onClick={(e) => { e.stopPropagation(); handleMemoTouchClick(e); }}
        >
          {memo ? (
            <span className="text-[10px] sm:text-xs font-bold leading-tight text-center truncate w-full">
              {memo}
            </span>
          ) : (
            <span className="text-[9px] sm:text-[10px] opacity-0 group-hover/col:opacity-30 transition-opacity font-bold">+</span>
          )}
        </div>
      </div>

      {isEditingMemo && (
        <PopupEditor
          title={`${getStepLabel(step)} 메모`}
          initialValue={memo || ""}
          type="text"
          centered={true}
          onConfirm={handleMemoSave}
          onCancel={() => setIsEditingMemo(false)}
        />
      )}
    </>
  );
});
