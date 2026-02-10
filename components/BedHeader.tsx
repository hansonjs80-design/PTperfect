
import React, { memo, useState } from 'react';
import { BedState, BedStatus, TreatmentStep } from '../types';
import { getBedHeaderStyles } from '../utils/styleUtils';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { TimerEditPopup } from './bed-card/TimerEditPopup';
import { BedStatusPopup } from './bed-card/BedStatusPopup';
import { BedNumberAndStatus } from './bed-card/BedNumberAndStatus';
import { BedTimer } from './bed-card/BedTimer';
import { useResponsiveClick } from '../hooks/useResponsiveClick';

interface BedHeaderProps {
  bed: BedState;
  currentStep: TreatmentStep | undefined;
  onTrashClick: (e: React.MouseEvent) => void;
  trashState: 'idle' | 'confirm' | 'deleting';
  onEditClick?: (id: number) => void;
  onTogglePause?: (id: number) => void;
  onUpdateDuration?: (id: number, duration: number) => void;
  // Status Toggle Props
  onToggleInjection: (id: number) => void;
  onToggleFluid: (id: number) => void;
  onToggleTraction: (id: number) => void;
  onToggleESWT: (id: number) => void;
  onToggleManual: (id: number) => void;
}

export const BedHeader = memo(({ 
  bed, 
  currentStep, 
  onTrashClick, 
  trashState, 
  onEditClick, 
  onTogglePause, 
  onUpdateDuration,
  onToggleInjection,
  onToggleFluid,
  onToggleTraction,
  onToggleESWT,
  onToggleManual
}: BedHeaderProps) => {
  const { setMovingPatientState } = useTreatmentContext();
  
  // Changed from boolean to coordinates object to support positioning
  const [timerMenuPos, setTimerMenuPos] = useState<{x: number, y: number} | null>(null);
  const [statusMenuPos, setStatusMenuPos] = useState<{x: number, y: number} | null>(null);
  
  const isTimerActive = bed.status === BedStatus.ACTIVE && !!currentStep?.enableTimer;
  const isOvertime = isTimerActive && bed.remainingTime <= 0;
  const isNearEnd = isTimerActive && bed.remainingTime > 0 && bed.remainingTime <= 60;
  
  // --- Handlers using useResponsiveClick Hook ---

  // 1. Timer Click
  const handleTimerInteraction = useResponsiveClick((e) => {
    if (!isTimerActive || !onUpdateDuration) return;
    setTimerMenuPos({ x: e.clientX, y: e.clientY });
  });

  // 2. Bed Number Click (Move Patient)
  const handleBedNumberInteraction = useResponsiveClick((e) => {
    if (bed.status !== BedStatus.IDLE) {
      setMovingPatientState({ bedId: bed.id, x: e.clientX, y: e.clientY });
    }
  });

  // 3. Status Icon Click
  const handleStatusInteraction = useResponsiveClick((e) => {
    setStatusMenuPos({ x: e.clientX, y: e.clientY });
  });

  const handleTimerSave = (newSeconds: number) => {
    if (onUpdateDuration) onUpdateDuration(bed.id, newSeconds);
    setTimerMenuPos(null);
  };

  const handleTogglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePause?.(bed.id);
  };

  return (
    <>
      <div 
        className={`flex items-center justify-between px-1.5 sm:px-2 py-0.5 sm:py-1 lg:px-3 lg:py-3 shrink-0 relative transition-colors ${getBedHeaderStyles(bed)}`}
        // Removed onClick/onDoubleClick to prevent popup on header background
      >
        
        {/* Left: Bed Number & Status Icons */}
        <BedNumberAndStatus 
          bed={bed} 
          onMovePatient={handleBedNumberInteraction}
          onEditStatus={handleStatusInteraction} 
        />

        {/* Right Section: Timer & Actions */}
        <div className="flex-1 flex justify-end items-center gap-0 sm:gap-1 lg:gap-2 pl-0 sm:pl-2">
          <BedTimer 
            bed={bed}
            isTimerActive={isTimerActive}
            isOvertime={isOvertime}
            isNearEnd={isNearEnd}
            onTimerClick={handleTimerInteraction}
            onTogglePause={handleTogglePause}
          />
        </div>
      </div>

      {timerMenuPos && (
        <TimerEditPopup
          title={`${bed.id === 11 ? '견인치료기' : `${bed.id}번 배드`} 시간 설정`}
          initialSeconds={bed.remainingTime}
          position={timerMenuPos}
          onConfirm={handleTimerSave}
          onCancel={() => setTimerMenuPos(null)}
        />
      )}

      {statusMenuPos && (
        <BedStatusPopup
          bed={bed}
          position={statusMenuPos}
          onClose={() => setStatusMenuPos(null)}
          onToggleInjection={onToggleInjection}
          onToggleFluid={onToggleFluid}
          onToggleTraction={onToggleTraction}
          onToggleESWT={onToggleESWT}
          onToggleManual={onToggleManual}
        />
      )}
    </>
  );
});
