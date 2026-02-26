
import React, { memo } from 'react';
import { TreatmentStep, BedState, BedStatus, QuickTreatment } from '../types';
import { BedStepColumn } from './BedStepColumn';

interface BedContentProps {
  steps: TreatmentStep[];
  bed: BedState;
  queue: number[];
  onSwapRequest?: (id: number, idx: number) => void;
  swapSourceIndex?: number | null;
  onReplaceStep?: (idx: number, qt: QuickTreatment) => void;
  quickTreatments?: QuickTreatment[];
}

export const BedContent: React.FC<BedContentProps> = memo(({
  steps,
  bed,
  onSwapRequest,
  swapSourceIndex,
  onReplaceStep,
  quickTreatments
}) => {
  const isCompleted = bed.status === BedStatus.COMPLETED;

  return (
    // Reduced min-h from 45px to 40px for tighter mobile view
    <div className="w-full h-auto sm:h-full min-h-[40px] flex flex-row gap-[1px] bg-slate-100 dark:bg-slate-700/50 p-[1px] overflow-hidden">
      {steps.map((step, idx) => {
        const isActive = idx === bed.currentStepIndex && bed.status === BedStatus.ACTIVE;
        const isPast = !isCompleted && idx < bed.currentStepIndex;
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
            bedId={bed.id}
            onSwapRequest={onSwapRequest}
            onReplaceStep={onReplaceStep}
            quickTreatments={quickTreatments}
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
    pBed.customPreset === nBed.customPreset;

  const isOtherPropsEqual =
    prevProps.steps === nextProps.steps &&
    prevProps.swapSourceIndex === nextProps.swapSourceIndex;

  return isBedEqual && isOtherPropsEqual;
});
