
import React, { memo, useState } from 'react';
import { SkipForward, SkipBack, Check, X, Settings, Plus } from 'lucide-react';
import { BedState, BedStatus, TreatmentStep, QuickTreatment } from '../types';
import { BedTrashButton } from './BedTrashButton';
import { FooterButton } from './bed-card/FooterButton';
import { StepReplacePopup } from './bed-card/StepReplacePopup';

interface BedFooterProps {
  isSwapControlMode?: boolean;

  bed: BedState;
  steps: TreatmentStep[];
  onNext: (bedId: number) => void;
  onPrev?: (bedId: number) => void;
  onClear: (bedId: number) => void;
  trashState?: 'idle' | 'confirm' | 'deleting';
  onTrashClick?: () => void;
  onEditClick?: (bedId: number) => void;
  onAddStep?: (qt: QuickTreatment) => void;
  quickTreatments?: QuickTreatment[];
}

export const BedFooter = memo(({ bed, steps, onNext, onPrev, onClear, trashState, onTrashClick, onEditClick, onAddStep, quickTreatments, isSwapControlMode = false }: BedFooterProps) => {
  const [addPopup, setAddPopup] = useState<{ x: number; y: number } | null>(null);
  const totalSteps = steps.length || 0;
  const isLastStep = bed.currentStepIndex === totalSteps - 1;
  const isCompleted = bed.status === BedStatus.COMPLETED;

  // Completed State: Prev Button + Clear Button
  if (isCompleted) {
    return (
      <div className="p-1 shrink-0 bg-white dark:bg-slate-800" data-keep-swap-selection="true">
        <div className="flex gap-1.5 h-[32px] sm:h-9 md:h-10">
          {/* 이전 단계로 복구 버튼 */}
          <FooterButton
            onClick={() => onPrev && onPrev(bed.id)}
            className="w-12 sm:w-14 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            title="이전 단계로 복구"
          >
            <SkipBack className="w-[18px] h-[18px] md:w-5 md:h-5" />
          </FooterButton>

          {/* 침상 비우기 버튼 */}
          <FooterButton
            onClick={() => onClear(bed.id)}
            className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 group"
          >
            <X className="w-[18px] h-[18px] group-hover:text-red-500 transition-colors" />
            <span className="group-hover:text-slate-800 dark:group-hover:text-white transition-colors text-xs md:text-sm font-bold whitespace-nowrap">침상 비우기</span>
          </FooterButton>
        </div>
      </div>
    );
  }

  // Active State: [Trash] [Settings] [+] [Prev] [Next]
  return (
    <>
      <div className="p-1 shrink-0 bg-white dark:bg-slate-800" data-keep-swap-selection="true">
        <div className="flex gap-1.5 h-[32px] sm:h-9">
           {onTrashClick && (
             isSwapControlMode ? (
               <FooterButton
                 onClick={() => onTrashClick()}
                 className="flex-1 h-full bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 font-black"
                 title="선택 단계 삭제"
               >
                 <X className="w-[18px] h-[18px] md:w-5 md:h-5" strokeWidth={3} />
               </FooterButton>
             ) : (
               trashState && (
                 <BedTrashButton
                   trashState={trashState}
                   onClick={(e) => { e.preventDefault(); onTrashClick(); }}
                   className="flex-1 h-full"
                 />
               )
             )
           )}

           {onEditClick && (
             <FooterButton
               onClick={() => onEditClick(bed.id)}
               className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
               title="설정"
             >
               <Settings className="w-[18px] h-[18px] md:w-5 md:h-5" />
             </FooterButton>
           )}

           {onAddStep && quickTreatments && quickTreatments.length > 0 && (
             <FooterButton
               onClick={() => {}}
               className="flex-1 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
               title="처방 추가"
             >
               <div
                 className="w-full h-full flex items-center justify-center"
                 onClick={(e) => {
                   e.stopPropagation();
                   setAddPopup({ x: e.clientX, y: e.clientY });
                 }}
               >
                 <Plus className="w-[18px] h-[18px] md:w-5 md:h-5" strokeWidth={3} />
               </div>
             </FooterButton>
           )}

           <FooterButton
             onClick={() => onPrev && onPrev(bed.id)}
             disabled={bed.currentStepIndex <= 0}
             className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
             title="이전"
           >
             {isSwapControlMode ? (
               <span className="text-lg md:text-xl font-black leading-none">&lt;</span>
             ) : (
               <SkipBack className="w-[18px] h-[18px] md:w-5 md:h-5" />
             )}
           </FooterButton>

           <FooterButton
             onClick={() => onNext(bed.id)}
             className={`flex-1 ${
               isSwapControlMode
                 ? 'bg-brand-100 hover:bg-brand-200 dark:bg-brand-900/40 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-black'
                 : (isLastStep
                   ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-200 dark:shadow-none'
                   : 'bg-brand-100 hover:bg-brand-200 dark:bg-brand-900/40 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-bold')
             }`}
           >
             {isSwapControlMode ? (
               <span className="text-lg md:text-xl font-black leading-none">&gt;</span>
             ) : isLastStep ? (
               <Check className="w-[18px] h-[18px] md:w-5 md:h-5" strokeWidth={3} />
             ) : (
               <SkipForward className="w-[18px] h-[18px] md:w-5 md:h-5" strokeWidth={3} />
             )}
           </FooterButton>
        </div>
      </div>

      {addPopup && onAddStep && quickTreatments && (
        <StepReplacePopup
          quickTreatments={quickTreatments}
          clickPos={addPopup}
          onSelect={(qt) => {
            onAddStep(qt);
            setAddPopup(null);
          }}
          onClose={() => setAddPopup(null)}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  const pBed = prevProps.bed;
  const nBed = nextProps.bed;
  return (
    pBed.id === nBed.id &&
    pBed.status === nBed.status &&
    pBed.currentStepIndex === nBed.currentStepIndex &&
    prevProps.steps === nextProps.steps &&
    prevProps.trashState === nextProps.trashState &&
    prevProps.isSwapControlMode === nextProps.isSwapControlMode
  );
});
