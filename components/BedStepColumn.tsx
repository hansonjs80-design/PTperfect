
import React, { memo, useState, useRef } from 'react';
import { TreatmentStep, QuickTreatment } from '../types';
import { getStepLabel } from '../utils/bedUtils';
import { getStepColor } from '../utils/styleUtils';
import { PopupEditor } from './common/PopupEditor';
import { StepReplacePopup } from './bed-card/StepReplacePopup';
import { ArrowRightLeft } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface BedStepColumnProps {
  step: TreatmentStep;
  index: number;
  isActive: boolean;
  isPast: boolean;
  isCompleted: boolean;
  isSelectedForSwap: boolean;
  bedId: number;
  onSwapRequest?: (id: number, idx: number) => void;
  onReplaceStep?: (idx: number, qt: QuickTreatment) => void;
  quickTreatments?: QuickTreatment[];
}

export const BedStepColumn: React.FC<BedStepColumnProps> = memo(({
  step,
  index,
  isActive,
  isPast,
  isCompleted,
  isSelectedForSwap,
  bedId,
  onSwapRequest,
  onReplaceStep,
  quickTreatments
}) => {
  const [replacePopup, setReplacePopup] = useState<{ x: number; y: number } | null>(null);
  const colorClass = getStepColor(step, isActive, isPast, false, isCompleted);
  const lastSwapClickRef = useRef<number>(0);

  // Desktop/Tablet check (>= 768px)
  const isDesktopOrTablet = useMediaQuery('(min-width: 768px)');

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isDesktopOrTablet || !onReplaceStep || !quickTreatments?.length) return;
    e.preventDefault();
    e.stopPropagation();
    setReplacePopup({ x: e.clientX, y: e.clientY });
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

  return (
    <>
      <div
        className={`
          flex-1 flex flex-col h-full min-w-0 group/col relative transition-all duration-300
          ${isActive ? 'z-10 shadow-md transform scale-[1.02] rounded-lg my-[-1px]' : ''}
          ${isSelectedForSwap ? 'z-20 scale-[0.98]' : ''}
        `}
        onClick={handleSwapInteraction}
        onContextMenu={handleContextMenu}
      >
        {/* Step Visual Block */}
        <div className={`
            flex-1 flex flex-col items-center justify-center p-0.5 sm:p-0.5 relative overflow-hidden transition-all duration-200
            ${colorClass}
            ${isSelectedForSwap ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 rounded-md' : ''}
        `}>
          <span className={`font-black text-base xs:text-lg sm:text-2xl md:text-[28px] lg:text-3xl leading-none text-center whitespace-nowrap px-0.5 ${isActive ? 'scale-110 drop-shadow-sm' : 'opacity-90'}`}>
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
      </div>

      {replacePopup && quickTreatments && onReplaceStep && (
        <StepReplacePopup
          quickTreatments={quickTreatments}
          clickPos={replacePopup}
          onSelect={(qt) => {
            onReplaceStep(index, qt);
            setReplacePopup(null);
          }}
          onClose={() => setReplacePopup(null)}
        />
      )}
    </>
  );
});
