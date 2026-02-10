
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

  const handleSwapDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSwapRequest && onSwapRequest(bedId, index);
  };

  const handleSwapTouchClick = (e: React.MouseEvent) => {
    if (window.matchMedia('(pointer: coarse)').matches) {
        const now = Date.now();
        if (now - lastSwapClickRef.current < 350) {
            e.stopPropagation();
            onSwapRequest && onSwapRequest(bedId, index);
            lastSwapClickRef.current = 0;
        } else {
            lastSwapClickRef.current = now;
        }
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
          ${isSelectedForSwap ? 'z-20' : ''}
        `}
        onDoubleClick={handleSwapDoubleClick}
        onClick={handleSwapTouchClick}
      >
        {/* Step Visual Block */}
        <div className={`
            flex-1 flex flex-col items-center justify-center p-1 sm:p-1.5 relative overflow-hidden transition-all duration-200 
            ${colorClass}
            ${isSelectedForSwap ? 'ring-4 ring-indigo-500 ring-inset shadow-inner' : ''}
        `}>
            <span className={`font-black text-base xs:text-lg sm:text-xl lg:text-2xl leading-none text-center whitespace-nowrap px-0.5 ${isActive ? 'scale-110 drop-shadow-sm' : 'opacity-90'}`}>
              {getStepLabel(step)}
            </span>
            
            {isActive && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />}
            
            {isSelectedForSwap && (
              <div className="absolute inset-0 bg-indigo-500/90 flex items-center justify-center animate-in fade-in duration-200 z-10">
                 <ArrowRightLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-bounce drop-shadow-md" strokeWidth={2.5} />
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
