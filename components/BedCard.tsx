
import React, { memo, useState, useEffect, useMemo } from 'react';
import { BedState, BedStatus, Preset } from '../types';
import { BedHeader } from './BedHeader';
import { BedContent } from './BedContent';
import { BedFooter } from './BedFooter';
import { BedEmptyState } from './BedEmptyState';
import { getBedCardStyles } from '../utils/styleUtils';
import { useTreatmentContext } from '../contexts/TreatmentContext';

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

  const currentPreset = bed.customPreset || presets.find(p => p.id === bed.currentPresetId);
  const currentStep = currentPreset?.steps[bed.currentStepIndex];
  const steps = currentPreset?.steps || [];
  
  // Timer Logic
  const isTimerActive = bed.status === BedStatus.ACTIVE && !!currentStep?.enableTimer;
  const isOvertime = isTimerActive && bed.remainingTime <= 0;
  // 1분(60초) 이하 남았을 때 (0초 초과)
  const isNearEnd = isTimerActive && bed.remainingTime > 0 && bed.remainingTime <= 60;
  
  const [trashState, setTrashState] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [swapSourceIndex, setSwapSourceIndex] = useState<number | null>(null);

  useEffect(() => {
    if (bed.status === BedStatus.IDLE) {
      setTrashState('idle');
      setSwapSourceIndex(null);
    }
  }, [bed.status]);

  const handleTrashClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trashState === 'idle') {
      setTrashState('confirm');
      setTimeout(() => setTrashState(prev => prev === 'confirm' ? 'idle' : prev), 3000);
    } else if (trashState === 'confirm') {
      setTrashState('deleting');
      requestAnimationFrame(() => {
        clearBed(bed.id);
      });
    }
  };

  const handleSwapRequest = (bedId: number, idx: number) => {
    if (swapSourceIndex === null) {
      // First click: Select source
      setSwapSourceIndex(idx);
    } else {
      // Second click: Execute swap or cancel if same
      if (swapSourceIndex !== idx) {
        swapSteps(bedId, swapSourceIndex, idx);
      }
      setSwapSourceIndex(null);
    }
  };

  const containerClass = useMemo(() => getBedCardStyles(bed, isOvertime, isNearEnd), [
    bed.status, bed.isInjection, bed.isFluid, bed.isESWT, bed.isTraction, bed.isManual, isOvertime, isNearEnd
  ]);

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
      {/* Mobile Portrait: flex-none to collapse height to content. sm:flex-1 to expand on larger screens */}
      <div className={`${bed.status === BedStatus.IDLE ? 'flex-1' : 'flex-none sm:flex-1'} flex flex-col w-full min-h-0 relative bg-white/40 dark:bg-slate-800/20 backdrop-blur-xs`}>
        {/* 
          BedContent Wrapper
          - Idle: flex-1 to center
          - Active (Mobile Portrait): flex-none, h-auto (let content dictate height)
          - Active (Mobile/Tablet Landscape): sm:landscape:flex-none
          - Active (Tablet/Desktop): sm:flex-1
        */}
        <div className={`${bed.status === BedStatus.IDLE ? 'flex-1' : 'flex-none h-auto sm:flex-1 sm:h-full sm:landscape:flex-none sm:landscape:h-auto lg:landscape:flex-1 lg:landscape:h-full'} flex flex-row w-full min-h-0`}>
          {bed.status === BedStatus.IDLE ? (
            <BedEmptyState onOpenSelector={() => setSelectingBedId(bed.id)} />
          ) : (
            <div 
              className="w-full h-full min-h-0"
              onDoubleClick={(e) => setEditingBedId(bed.id)}
            >
              <BedContent 
                steps={steps}
                bed={bed}
                queue={[]} // Queue visual removed
                onSwapRequest={handleSwapRequest}
                swapSourceIndex={swapSourceIndex}
                onUpdateMemo={updateMemo}
              />
            </div>
          )}
        </div>

        {/* Removed BedStatusBadges from here as it is now in Header */}
        
        {/* Spacer removed to eliminate empty space above footer in mobile portrait */}
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
