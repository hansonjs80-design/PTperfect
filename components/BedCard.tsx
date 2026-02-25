
import React, { memo, useMemo, useRef, useCallback, useEffect } from 'react';
import { BedState, BedStatus, Preset, QuickTreatment } from '../types';
import { BedHeader } from './BedHeader';
import { BedContent } from './BedContent';
import { BedFooter } from './BedFooter';
import { BedEmptyState } from './BedEmptyState';
import { getBedCardStyles } from '../utils/styleUtils';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { useBedCardActions } from '../hooks/useBedCardActions';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface BedCardProps {
  bed: BedState;
  presets: Preset[];
  isCompact: boolean;
}

export const BedCard: React.FC<BedCardProps> = memo(({
  bed,
  presets,
  isCompact
}) => {
  const {
    setSelectingBedId,
    setEditingBedId,
    nextStep,
    prevStep,
    togglePause,
    swapSteps,
    clearBed,
    updateMemo,
    updateBedDuration,
    toggleInjection,
    toggleFluid,
    toggleTraction,
    toggleESWT,
    toggleManual,
    toggleInjectionCompleted,
    updateBedSteps,
    quickTreatments
  } = useTreatmentContext();

  const {
    trashState,
    handleTrashClick,
    swapSourceIndex,
    handleSwapRequest,
    cancelSwap
  } = useBedCardActions(bed.status, bed.id, clearBed, swapSteps);

  // Desktop only (>= 768px)
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const currentPreset = bed.customPreset || presets.find(p => p.id === bed.currentPresetId);
  const currentStep = currentPreset?.steps[bed.currentStepIndex];
  const steps = currentPreset?.steps || [];

  const isTimerActive = bed.status === BedStatus.ACTIVE && !!currentStep?.enableTimer;
  const isOvertime = isTimerActive && bed.remainingTime <= 0;
  const isNearEnd = isTimerActive && bed.remainingTime > 0 && bed.remainingTime <= 60;

  const containerClass = useMemo(() => getBedCardStyles(bed, isOvertime, isNearEnd), [
    bed.status, bed.isInjection, bed.isFluid, bed.isESWT, bed.isTraction, bed.isManual, isOvertime, isNearEnd
  ]);

  const handleReplaceStep = useCallback((idx: number, qt: QuickTreatment) => {
    const newSteps = steps.map((s, i) => {
      if (i !== idx) return s;
      return {
        id: crypto.randomUUID(),
        name: qt.name,
        label: qt.label,
        duration: qt.duration * 60,
        enableTimer: qt.enableTimer,
        color: qt.color,
      };
    });
    updateBedSteps(bed.id, newSteps);
  }, [steps, bed.id, updateBedSteps]);

  const handleAddStep = useCallback((qt: QuickTreatment) => {
    const newStep = {
      id: crypto.randomUUID(),
      name: qt.name,
      label: qt.label,
      duration: qt.duration * 60,
      enableTimer: qt.enableTimer,
      color: qt.color,
    };
    updateBedSteps(bed.id, [...steps, newStep]);
  }, [steps, bed.id, updateBedSteps]);

  const lastClickTimeRef = useRef<number>(0);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingBedId(bed.id);
  };

  const handleTouchClick = (e: React.MouseEvent) => {
    if (window.matchMedia('(pointer: coarse)').matches) {
      const now = Date.now();
      if (now - lastClickTimeRef.current < 350) {
        e.preventDefault();
        e.stopPropagation();
        setEditingBedId(bed.id);
        lastClickTimeRef.current = 0;
      } else {
        lastClickTimeRef.current = now;
      }
    }
  };

  // Desktop only: Backspace/Delete removes the swap-selected step
  useEffect(() => {
    if (swapSourceIndex === null || !isDesktop) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        // Prevent deleting the last remaining step
        if (steps.length <= 1) {
          cancelSwap();
          return;
        }
        const deletedIdx = swapSourceIndex;
        const newSteps = steps.filter((_, i) => i !== deletedIdx);
        // Adjust currentStepIndex if the deleted step was before it
        let newIdx = bed.currentStepIndex;
        if (deletedIdx < bed.currentStepIndex) {
          newIdx = bed.currentStepIndex - 1;
        } else if (deletedIdx === bed.currentStepIndex && deletedIdx >= newSteps.length) {
          newIdx = Math.max(0, newSteps.length - 1);
        }
        updateBedSteps(bed.id, newSteps, newIdx);
        cancelSwap();
      } else if (e.key === 'Escape') {
        cancelSwap();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [swapSourceIndex, isDesktop, steps, bed.id, bed.currentStepIndex, updateBedSteps, cancelSwap]);

  return (
    <div className={`${containerClass} transform transition-transform duration-200 active:scale-[0.99]`}>
      <BedHeader
        bed={bed}
        currentStep={currentStep}
        onTrashClick={handleTrashClick}
        trashState={trashState}
        onEditClick={setEditingBedId}
        onTogglePause={togglePause}
        onUpdateDuration={updateBedDuration}
        onToggleInjection={toggleInjection}
        onToggleFluid={toggleFluid}
        onToggleTraction={toggleTraction}
        onToggleESWT={toggleESWT}
        onToggleManual={toggleManual}
        onToggleInjectionCompleted={toggleInjectionCompleted}
      />

      {/* Main Content Area */}
      <div className={`${bed.status === BedStatus.IDLE ? 'flex-1' : 'flex-none sm:flex-1'} flex flex-col w-full min-h-0 relative bg-white/40 dark:bg-slate-800/20 backdrop-blur-xs`}>
        <div className={`${bed.status === BedStatus.IDLE ? 'flex-1' : 'flex-none h-auto sm:flex-1 sm:h-full sm:landscape:flex-none sm:landscape:h-auto lg:landscape:flex-1 lg:landscape:h-full'} flex flex-row w-full min-h-0`}>
          {bed.status === BedStatus.IDLE ? (
            <BedEmptyState onOpenSelector={() => setSelectingBedId(bed.id)} />
          ) : (
            <div
              className="w-full h-full min-h-0"
              onDoubleClick={handleDoubleClick}
              onClick={handleTouchClick}
            >
              <BedContent
                steps={steps}
                bed={bed}
                queue={[]}
                onSwapRequest={handleSwapRequest}
                swapSourceIndex={swapSourceIndex}
                onUpdateMemo={updateMemo}
                onReplaceStep={handleReplaceStep}
                quickTreatments={quickTreatments}
              />
            </div>
          )}
        </div>
      </div>

      {bed.status !== BedStatus.IDLE && (
        <BedFooter
          bed={bed}
          steps={steps}
          onNext={nextStep}
          onPrev={prevStep}
          onClear={clearBed}
          trashState={trashState}
          onTrashClick={handleTrashClick}
          onEditClick={setEditingBedId}
          onAddStep={handleAddStep}
          quickTreatments={quickTreatments}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.bed.remainingTime === nextProps.bed.remainingTime &&
    prevProps.bed.status === nextProps.bed.status &&
    prevProps.bed.currentStepIndex === nextProps.bed.currentStepIndex &&
    prevProps.bed.isPaused === nextProps.bed.isPaused &&
    prevProps.bed.isInjection === nextProps.bed.isInjection &&
    prevProps.bed.isFluid === nextProps.bed.isFluid &&
    prevProps.bed.isManual === nextProps.bed.isManual &&
    prevProps.bed.isInjectionCompleted === nextProps.bed.isInjectionCompleted &&
    prevProps.bed.patientMemo === nextProps.bed.patientMemo &&
    prevProps.bed.isESWT === nextProps.bed.isESWT &&
    prevProps.bed.isTraction === nextProps.bed.isTraction &&
    prevProps.bed.customPreset === nextProps.bed.customPreset &&
    prevProps.presets === nextProps.presets &&
    prevProps.isCompact === nextProps.isCompact
  );
});
