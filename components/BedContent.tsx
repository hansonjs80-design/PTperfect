
import React, { memo } from 'react';
import { TreatmentStep, BedState, BedStatus } from '../types';
import { BedStepColumn } from './BedStepColumn';

interface BedContentProps {
  steps: TreatmentStep[];
  bed: BedState;
  queue: number[];
  onSwapRequest?: (id: number, idx: number) => void;
  swapSourceIndex?: number | null;
  onUpdateMemo?: (id: number, idx: number, val: string | null) => void;
}

export const BedContent: React.FC<BedContentProps> = memo(({ 
  steps, 
  bed, 
  onSwapRequest,
  swapSourceIndex,
  onUpdateMemo 
}) => {
  const isCompleted = bed.status === BedStatus.COMPLETED;

  return (
    // Removed divide-x, added slight gap for card-like feel for columns
    <div className="w-full h-auto sm:h-full min-h-[60px] flex flex-row gap-[1px] bg-slate-100 dark:bg-slate-700/50 p-[1px] overflow-hidden">
      {steps.map((step, idx) => {
        const isActive = idx === bed.currentStepIndex && bed.status === BedStatus.ACTIVE;
        const isPast = !isCompleted && idx < bed.currentStepIndex;
        const memo = bed.memos?.[idx];
        const isSelectedForSwap = swapSourceIndex === idx;
        
        return (
          <BedStepColumn
            key={step.id || idx}
            step={step}
            index={idx}
            isActive={isActive}
            isPast={isPast}
            isCompleted={isCompleted}
            isSelectedForSwap={isSelectedForSwap}
            memo={memo}
            bedId={bed.id}
            onSwapRequest={onSwapRequest}
            onUpdateMemo={onUpdateMemo}
          />
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
  const pBed = prevProps.bed;
  const nBed = nextProps.bed;

  const isBedEqual = 
    pBed.id === nBed.id &&
    pBed.status === nBed.status &&
    pBed.currentStepIndex === nBed.currentStepIndex &&
    pBed.currentPresetId === nBed.currentPresetId &&
    pBed.customPreset === nBed.customPreset &&
    pBed.memos === nBed.memos;

  const isOtherPropsEqual = 
    prevProps.steps === nextProps.steps &&
    prevProps.swapSourceIndex === nextProps.swapSourceIndex;

  return isBedEqual && isOtherPropsEqual;
});
