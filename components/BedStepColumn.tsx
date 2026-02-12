
import React, { memo, useState, useRef } from 'react';
import { TreatmentStep } from '../types';
import { getStepLabel } from '../utils/bedUtils';
import { getStepColor } from '../utils/styleUtils';
import { PopupEditor } from './common/PopupEditor';
import { ArrowRightLeft } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';

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
  
  // Desktop/Tablet check (>= 768px)
  const isDesktopOrTablet = useMediaQuery('(min-width: 768px)');

  const handleMemoDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onUpdateMemo) return;
    setIsEditingMemo(true);
  };

  const handleMemoInteraction = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isDesktopOrTablet) {
        // Desktop/Tablet: Single Click -> Edit
        if (onUpdateMemo) setIsEditingMemo(true);
    } else {
        // Mobile: Double Tap Logic
        if (window.matchMedia('(pointer: coarse)').matches) {
            const now = Date.now();
            if (now - lastMemoClickRef.current < 350) {
                e.preventDefault();
                if (onUpdateMemo) setIsEditingMemo(true);
                lastMemoClickRef.current = 0;
            } else {
                lastMemoClickRef.current = now;
            }
        }
    }
  };

  const handleSwapInteraction = (e: React.MouseEvent) => {
    // 1. Desktop & Tablet (Width >= 768px) -> Single Click
    if (isDesktopOrTablet) {
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
    }
  };

  const handleMemoSave = (val: string) => {
    if (onUpdateMemo) {
      onUpdateMemo(bedId, index, val === "" ? null : val);
    }
    setIsEditingMemo(false);
  };

  const handleInlineBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    handleMemoSave(e.target.value);
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleMemoSave(e.currentTarget.value);
    } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditingMemo(false);
    }
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
            h-[24px] sm:h-[32px] flex items-center justify-center px-1 cursor-pointer transition-colors select-none border-t border-black/5 dark:border-white/5 relative
            ${isActive 
               ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200' 
               : 'bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'
            }
          `}
          onDoubleClick={handleMemoDoubleClick}
          onClick={handleMemoInteraction}
        >
          {isEditingMemo && isDesktopOrTablet ? (
             <input
               autoFocus
               defaultValue={memo || ""}
               className="w-full h-full bg-white dark:bg-slate-600 text-center border-2 border-brand-500 rounded-none outline-none p-0 text-base font-bold text-slate-800 dark:text-white leading-none"
               onBlur={handleInlineBlur}
               onKeyDown={handleInlineKeyDown}
               onClick={(e) => e.stopPropagation()}
             />
          ) : (
             memo ? (
                <span className="text-base font-bold leading-none text-center truncate w-full">
                  {memo}
                </span>
              ) : (
                <span className="text-xs sm:text-sm opacity-0 group-hover/col:opacity-30 transition-opacity font-bold">+</span>
              )
          )}
        </div>
      </div>

      {isEditingMemo && !isDesktopOrTablet && (
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
