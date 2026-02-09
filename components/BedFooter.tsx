
import React, { memo } from 'react';
import { SkipForward, SkipBack, Check, X, Settings } from 'lucide-react';
import { BedState, BedStatus, TreatmentStep } from '../types';
import { BedTrashButton } from './BedTrashButton';

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

const FooterButton = ({ 
  onClick, 
  disabled, 
  className, 
  children, 
  title 
}: { 
  onClick: () => void; 
  disabled?: boolean; 
  className: string; 
  children?: React.ReactNode; 
  title?: string;
}) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm ${className} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    title={title}
  >
    {children}
  </button>
);

export const BedFooter = memo(({ bed, steps, onNext, onPrev, onClear, trashState, onTrashClick, onEditClick }: BedFooterProps) => {
  const totalSteps = steps.length || 0;
  const isLastStep = bed.currentStepIndex === totalSteps - 1;
  const isCompleted = bed.status === BedStatus.COMPLETED;

  // Completed State: Full width Clear Button
  if (isCompleted) {
    return (
      <div className="p-1 shrink-0 bg-white dark:bg-slate-800">
        <FooterButton 
          onClick={() => onClear(bed.id)}
          // Height: 32px on mobile (h-[32px]), 36px on desktop (sm:h-9)
          className="w-full py-2 h-[32px] sm:h-9 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 group"
        >
          <X className="w-[18px] h-[18px] group-hover:text-red-500 transition-colors" />
          <span className="group-hover:text-slate-800 dark:group-hover:text-white transition-colors text-xs font-bold">침상 비우기</span>
        </FooterButton>
      </div>
    );
  }

  // Active State: Navigation & Trash & Settings(Mobile)
  return (
    <div className="p-1 shrink-0 bg-white dark:bg-slate-800">
      {/* Container Height: 32px on mobile, 36px on desktop */}
      <div className="flex gap-1.5 h-[32px] sm:h-9">
         
         {/* Prev Button */}
         <FooterButton 
           onClick={() => onPrev && onPrev(bed.id)}
           disabled={bed.currentStepIndex <= 0}
           className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
           title="이전"
         >
           <SkipBack className="w-[18px] h-[18px]" /> 
         </FooterButton>
         
         {/* Settings Button: Visible on All Devices */}
         {onEditClick && (
           <FooterButton
             onClick={() => onEditClick(bed.id)}
             className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
             title="설정"
           >
             <Settings className="w-[18px] h-[18px]" />
           </FooterButton>
         )}
         
         {/* Trash Button */}
         {trashState && onTrashClick && (
           <div className="flex-1 flex">
             <button 
               onClick={onTrashClick}
               disabled={trashState === 'deleting'}
               className={`w-full h-full rounded-lg transition-all duration-200 flex items-center justify-center active:scale-95 shadow-sm ${
                 trashState === 'idle' ? 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 hover:text-red-600 hover:bg-red-50' :
                 trashState === 'confirm' ? 'bg-red-500 text-white ring-2 ring-red-200 dark:ring-red-900' :
                 'bg-slate-100 text-slate-400'
               }`}
             >
                <BedTrashButton trashState={trashState} onClick={onTrashClick} />
             </button>
           </div>
         )}

         {/* Next Button */}
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
