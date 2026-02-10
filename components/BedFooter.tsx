
import React, { memo } from 'react';
import { SkipForward, SkipBack, Check, X, Settings } from 'lucide-react';
import { BedState, BedStatus, TreatmentStep } from '../types';
import { BedTrashButton } from './BedTrashButton';
import { FooterButton } from './bed-card/FooterButton';

interface BedFooterProps {
  bed: BedState;
  steps: TreatmentStep[];
  onNext: (bedId: number) => void;
  onPrev?: (bedId: number) => void;
  onClear: (bedId: number) => void;
  trashState?: 'idle' | 'confirm' | 'deleting';
  onTrashClick?: (e: React.MouseEvent) => void;
  onEditClick?: (bedId: number) => void;
}

export const BedFooter = memo(({ bed, steps, onNext, onPrev, onClear, trashState, onTrashClick, onEditClick }: BedFooterProps) => {
  const totalSteps = steps.length || 0;
  const isLastStep = bed.currentStepIndex === totalSteps - 1;
  const isCompleted = bed.status === BedStatus.COMPLETED;

  // Completed State: Prev Button + Clear Button
  if (isCompleted) {
    return (
      <div className="p-1 shrink-0 bg-white dark:bg-slate-800">
        <div className="flex gap-1.5 h-[32px] sm:h-9">
          {/* 이전 단계로 복구 버튼 */}
          <FooterButton 
            onClick={() => onPrev && onPrev(bed.id)}
            className="w-12 sm:w-14 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            title="이전 단계로 복구"
          >
            <SkipBack className="w-[18px] h-[18px]" />
          </FooterButton>

          {/* 침상 비우기 버튼 */}
          <FooterButton 
            onClick={() => onClear(bed.id)}
            className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 group"
          >
            <X className="w-[18px] h-[18px] group-hover:text-red-500 transition-colors" />
            <span className="group-hover:text-slate-800 dark:group-hover:text-white transition-colors text-xs font-bold whitespace-nowrap">침상 비우기</span>
          </FooterButton>
        </div>
      </div>
    );
  }

  // Active State: [Trash] [Settings] [Prev] [Next]
  return (
    <div className="p-1 shrink-0 bg-white dark:bg-slate-800">
      <div className="flex gap-1.5 h-[32px] sm:h-9">
         {trashState && onTrashClick && (
           <BedTrashButton 
             trashState={trashState} 
             onClick={onTrashClick}
             className="flex-1 h-full"
           />
         )}

         {onEditClick && (
           <FooterButton
             onClick={() => onEditClick(bed.id)}
             className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
             title="설정"
           >
             <Settings className="w-[18px] h-[18px]" />
           </FooterButton>
         )}

         <FooterButton 
           onClick={() => onPrev && onPrev(bed.id)}
           disabled={bed.currentStepIndex <= 0}
           className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
           title="이전"
         >
           <SkipBack className="w-[18px] h-[18px]" /> 
         </FooterButton>

         <FooterButton 
           onClick={() => onNext(bed.id)}
           className={`flex-1 ${
             isLastStep 
               ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-200 dark:shadow-none' 
               : 'bg-brand-100 hover:bg-brand-200 dark:bg-brand-900/40 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-bold'
           }`}
         >
           {isLastStep ? (
             <Check className="w-[18px] h-[18px]" strokeWidth={3} />
           ) : (
             <SkipForward className="w-[18px] h-[18px]" strokeWidth={3} />
           )}
         </FooterButton>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  const pBed = prevProps.bed;
  const nBed = nextProps.bed;
  return (
    pBed.id === nBed.id &&
    pBed.status === nBed.status &&
    pBed.currentStepIndex === nBed.currentStepIndex &&
    prevProps.steps === nextProps.steps &&
    prevProps.trashState === nextProps.trashState
  );
});
