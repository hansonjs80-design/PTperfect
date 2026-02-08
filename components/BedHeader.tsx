
import React, { memo, useState } from 'react';
import { BedState, BedStatus, TreatmentStep } from '../types';
import { getBedHeaderStyles } from '../utils/styleUtils';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { TimerEditPopup } from './bed-card/TimerEditPopup';
import { BedStatusPopup } from './bed-card/BedStatusPopup';
import { BedNumberAndStatus } from './bed-card/BedNumberAndStatus';
import { BedTimer } from './bed-card/BedTimer';

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
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);

  const isTimerActive = bed.status === BedStatus.ACTIVE && !!currentStep?.enableTimer;
  const isOvertime = isTimerActive && bed.remainingTime <= 0;
  const isNearEnd = isTimerActive && bed.remainingTime > 0 && bed.remainingTime <= 60;
  
  const handleTimerDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isTimerActive || !onUpdateDuration) return;
    setIsEditingTimer(true);
  };

  const handleTimerSave = (newSeconds: number) => {
    if (onUpdateDuration) onUpdateDuration(bed.id, newSeconds);
    setIsEditingTimer(false);
  };

  const handleTogglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePause?.(bed.id);
  };

  const handleBedNumberDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 비어있는 배드는 이동 창을 띄우지 않음
    if (bed.status === BedStatus.IDLE) return;
    setMovingPatientState({ bedId: bed.id, x: e.clientX, y: e.clientY });
  };

  const handleStatusDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingStatus(true);
  };

  return (
    <>
      <div className={`flex items-center justify-between px-2 py-1 lg:px-3 lg:py-3 shrink-0 relative transition-colors ${getBedHeaderStyles(bed)}`}>
        
        {/* Left: Bed Number & Status Icons */}
        <BedNumberAndStatus 
          bed={bed} 
          onMovePatient={handleBedNumberDoubleClick} 
          onEditStatus={handleStatusDoubleClick} 
        />

        {/* Right Section: Timer & Actions */}
        <div className="flex-1 flex justify-end items-center gap-1 lg:gap-2 pl-2">
          
          <BedTimer 
            bed={bed}
            isTimerActive={isTimerActive}
            isOvertime={isOvertime}
            isNearEnd={isNearEnd}
            onTimerClick={handleTimerDoubleClick}
            onTogglePause={handleTogglePause}
          />
        </div>
      </div>

      {isEditingTimer && (
        <TimerEditPopup
          title={`${bed.id === 11 ? '견인치료기' : `${bed.id}번 배드`} 시간 설정`}
          initialSeconds={bed.remainingTime}
          onConfirm={handleTimerSave}
          onCancel={() => setIsEditingTimer(false)}
        />
      )}

      {isEditingStatus && (
        <BedStatusPopup
          bed={bed}
          onClose={() => setIsEditingStatus(false)}
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
