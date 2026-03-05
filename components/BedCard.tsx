
import React, { memo, useMemo, useRef, useCallback, useEffect, useState } from 'react';
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
    openTreatmentSelectorForBed,
    setEditingBedId,
    nextStep,
    prevStep,
    togglePause,
    swapSteps,
    clearBed,
    updatePatientMemo,
    updateBedDuration,
    toggleInjection,
    toggleFluid,
    toggleTraction,
    toggleESWT,
    toggleManual,
    toggleInjectionCompleted,
    updateBedSteps,
    startTimerOnly,
    quickTreatments
  } = useTreatmentContext();

  const {
    trashState,
    handleTrashClick,
    swapSourceStepId,
    getSelectedSwapIndex,
    handleSwapRequest,
    handleMoveSelectedStep,
    cancelSwap
  } = useBedCardActions(bed.status, bed.id, clearBed, swapSteps);

  // Desktop only (>= 768px)
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const isCoarsePointer = useMediaQuery('(pointer: coarse)');
  const isTabletOrMobileLayout = useMediaQuery('(max-width: 1024px)');

  const currentPreset = bed.customPreset || presets.find(p => p.id === bed.currentPresetId);
  const currentStep = currentPreset?.steps[bed.currentStepIndex];
  const steps = currentPreset?.steps || [];
  const swapSourceIndex = getSelectedSwapIndex(steps);

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

  const [isEditingMemo, setIsEditingMemo] = useState(false);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-swap-cell="true"]')) {
      openTreatmentSelectorForBed(bed.id);
      return;
    }

    setEditingBedId(bed.id);
  };

  const handleTouchClick = (e: React.MouseEvent) => {
    if (!window.matchMedia('(pointer: coarse)').matches) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-swap-cell="true"]')) {
      openTreatmentSelectorForBed(bed.id);
    } else {
      setEditingBedId(bed.id);
    }
  };

  const handleMemoDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingMemo(true);
  };

  const handleMemoInteraction = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Desktop: Click to Edit
    if (isDesktop) {
      setIsEditingMemo(true);
      return;
    }

    // Tablet & Mobile: single tap to edit
    if (window.matchMedia('(pointer: coarse)').matches) {
      setIsEditingMemo(true);
    }
  };



  const handleMemoSave = (val: string) => {
    updatePatientMemo(bed.id, val === "" ? undefined : val);
    setIsEditingMemo(false);
  };

  const handleMemoBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    handleMemoSave(e.target.value);
  };

  const handleMemoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleMemoSave(e.currentTarget.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingMemo(false);
    }
  };

  const handleDeleteSelectedStep = useCallback(() => {
    if (swapSourceIndex === null || steps.length <= 1) {
      cancelSwap();
      return;
    }

    const deletedIdx = swapSourceIndex;
    const newSteps = steps.filter((_, i) => i !== deletedIdx);
    let newIdx = bed.currentStepIndex;

    if (deletedIdx < bed.currentStepIndex) {
      newIdx = bed.currentStepIndex - 1;
    } else if (deletedIdx === bed.currentStepIndex && deletedIdx >= newSteps.length) {
      newIdx = Math.max(0, newSteps.length - 1);
    }

    updateBedSteps(bed.id, newSteps, newIdx);
    cancelSwap();
  }, [swapSourceIndex, steps, bed.currentStepIndex, bed.id, updateBedSteps, cancelSwap]);



  const isStepSelected = swapSourceIndex !== null;
  const isTouchSwapControlMode = (isCoarsePointer || isTabletOrMobileLayout) && bed.status === BedStatus.ACTIVE && isStepSelected;

  const handleFooterTrashClick = useCallback(() => {
    if (isTouchSwapControlMode) {
      handleDeleteSelectedStep();
      return;
    }
    handleTrashClick();
  }, [isTouchSwapControlMode, handleDeleteSelectedStep, handleTrashClick]);

  const handleFooterPrev = useCallback((bedId: number) => {
    if (isTouchSwapControlMode) {
      handleMoveSelectedStep('left', steps);
      return;
    }
    prevStep(bedId);
  }, [isTouchSwapControlMode, handleMoveSelectedStep, steps, prevStep]);

  const handleFooterNext = useCallback((bedId: number) => {
    if (isTouchSwapControlMode) {
      handleMoveSelectedStep('right', steps);
      return;
    }
    nextStep(bedId);
  }, [isTouchSwapControlMode, handleMoveSelectedStep, steps, nextStep]);

  // Desktop only: Backspace/Delete removes the swap-selected step
  useEffect(() => {
    if (swapSourceIndex === null || !isDesktop) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDeleteSelectedStep();
      } else if (e.key === 'ArrowLeft') {
        if (e.repeat) return;
        e.preventDefault();
        handleMoveSelectedStep('left', steps);
      } else if (e.key === 'ArrowRight') {
        if (e.repeat) return;
        e.preventDefault();
        handleMoveSelectedStep('right', steps);
      } else if (e.key === 'Escape') {
        cancelSwap();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [swapSourceIndex, isDesktop, steps, handleMoveSelectedStep, cancelSwap, handleDeleteSelectedStep]);

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
            <BedEmptyState onOpenSelector={() => openTreatmentSelectorForBed(bed.id)} onStartTimerOnly={(minutes) => startTimerOnly(bed.id, minutes)} />
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
                onSwapRequest={(targetBedId, idx) => handleSwapRequest(targetBedId, idx, steps)}
                swapSourceIndex={swapSourceIndex}
                onMoveSelectedStep={(direction) => handleMoveSelectedStep(direction, steps)}
                totalSteps={steps.length}
                onBackgroundTap={cancelSwap}
                onDeleteSelectedStep={handleDeleteSelectedStep}
                onCancelSelection={cancelSwap}
                onReplaceStep={handleReplaceStep}
                quickTreatments={quickTreatments}
                onOpenTreatmentSelector={openTreatmentSelectorForBed}
                onOpenBedEdit={setEditingBedId}
              />
            </div>
          )}
        </div>

        {/* Single Memo Area */}
        {bed.status !== BedStatus.IDLE && (
          <div
            className="w-full h-[30px] sm:h-[36px] bg-white/80 dark:bg-slate-800/80 border-t border-black/5 dark:border-white/5 flex items-center justify-center px-2 cursor-pointer transition-colors hover:bg-white dark:hover:bg-slate-700"
            onClick={handleMemoInteraction}
            onDoubleClick={handleMemoDoubleClick}
          >
            {isEditingMemo ? (
              <input
                autoFocus
                defaultValue={bed.patientMemo || ""}
                className="w-full h-full bg-white dark:bg-slate-600 text-center border-2 border-brand-500 rounded-none outline-none p-0 text-base font-bold text-slate-800 dark:text-white leading-none"
                onBlur={handleMemoBlur}
                onKeyDown={handleMemoKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              bed.patientMemo ? (
                <span className="text-base sm:text-lg font-bold leading-none text-center truncate w-full text-slate-700 dark:text-slate-300">
                  {bed.patientMemo}
                </span>
              ) : (
                <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-bold opacity-50 hover:opacity-100 transition-opacity">
                  + 메모 추가
                </span>
              )
            )}
          </div>
        )}
      </div>

      {bed.status !== BedStatus.IDLE && (
        <BedFooter
          bed={bed}
          steps={steps}
          onNext={handleFooterNext}
          onPrev={handleFooterPrev}
          onClear={clearBed}
          trashState={trashState}
          onTrashClick={handleFooterTrashClick}
          isSwapControlMode={isTouchSwapControlMode}
          onEditClick={setEditingBedId}
          onAddStep={handleAddStep}
          quickTreatments={quickTreatments}
          swapSourceIndex={swapSourceIndex}
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
