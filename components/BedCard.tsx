
import React, { memo, useMemo, useRef } from 'react';
import { BedState, BedStatus, Preset } from '../types';
import { BedHeader } from './BedHeader';
import { BedContent } from './BedContent';
import { BedFooter } from './BedFooter';
import { BedEmptyState } from './BedEmptyState';
import { getBedCardStyles } from '../utils/styleUtils';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { useBedCardActions } from '../hooks/useBedCardActions';

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
    toggleManual
  } = useTreatmentContext();

  const { 
    trashState, 
    handleTrashClick, 
    swapSourceIndex, 
    handleSwapRequest 
  } = useBedCardActions(bed.status, bed.id, clearBed, swapSteps);

  const currentPreset = bed.customPreset || presets.find(p => p.id === bed.currentPresetId);
  const currentStep = currentPreset?.steps[bed.currentStepIndex];
  const steps = currentPreset?.steps || [];
  
  const isTimerActive = bed.status === BedStatus.ACTIVE && !!currentStep?.enableTimer;
  const isOvertime = isTimerActive && bed.remainingTime <= 0;
  const isNearEnd = isTimerActive && bed.remainingTime > 0 && bed.remainingTime <= 60;
  
  const containerClass = useMemo(() => getBedCardStyles(bed, isOvertime, isNearEnd), [
    bed.status, bed.isInjection, bed.isFluid, bed.isESWT, bed.isTraction, bed.isManual, isOvertime, isNearEnd
  ]);

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
    prevProps.bed.isESWT === nextProps.bed.isESWT &&
    prevProps.bed.isTraction === nextProps.bed.isTraction &&
    prevProps.bed.customPreset === nextProps.bed.customPreset && 
    prevProps.presets === nextProps.presets && 
    prevProps.isCompact === nextProps.isCompact
  );
});
