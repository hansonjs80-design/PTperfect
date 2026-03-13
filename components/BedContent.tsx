
import React, { memo } from 'react';
import { TreatmentStep, BedState, BedStatus, QuickTreatment } from '../types';
import { BedStepColumn } from './BedStepColumn';

interface BedContentProps {
  steps: TreatmentStep[];
  bed: BedState;
  queue: number[];
  onSwapRequest?: (id: number, idx: number) => void;
  swapSourceIndex?: number | null;
  onMoveSelectedStep?: (direction: 'left' | 'right') => void;
  totalSteps?: number;
  onBackgroundTap?: () => void;
  onDeleteSelectedStep?: () => void;
  onCancelSelection?: () => void;
  onReplaceStep?: (idx: number, qt: QuickTreatment) => void;
  quickTreatments?: QuickTreatment[];
  onOpenTreatmentSelector?: (bedId: number) => void;
  onOpenBedEdit?: (bedId: number) => void;
}

export const BedContent: React.FC<BedContentProps> = memo(({
  steps,
  bed,
  onSwapRequest,
  swapSourceIndex,
  onMoveSelectedStep,
  totalSteps,
  onBackgroundTap,
  onDeleteSelectedStep,
  onCancelSelection,
  onReplaceStep,
  quickTreatments,
  onOpenTreatmentSelector,
  onOpenBedEdit
}) => {
  const isCompleted = bed.status === BedStatus.COMPLETED;

  return (
    // Reduced min-h from 45px to 40px for tighter mobile view
    <div
      data-swap-scope="true"
      className="w-full h-auto sm:h-full min-h-[40px] flex flex-row gap-[1px] bg-slate-100 dark:bg-slate-700/50 p-[1px] overflow-hidden"
      onClick={(e) => { if (e.target === e.currentTarget) onBackgroundTap && onBackgroundTap(); }}
    >
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
            onMoveSelectedStep={onMoveSelectedStep}
            totalSteps={totalSteps ?? steps.length}
            onReplaceStep={onReplaceStep}
            onDeleteSelectedStep={onDeleteSelectedStep}
            onCancelSelection={onCancelSelection}
            quickTreatments={quickTreatments}
            onOpenTreatmentSelector={onOpenTreatmentSelector}
            onOpenBedEdit={onOpenBedEdit}
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
