
import React, { memo, useState, useRef } from 'react';
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
  const [statusMenuPos, setStatusMenuPos] = useState<{x: number, y: number} | null>(null);
  
  // Refs for manual double tap detection on mobile
  const lastHeaderClickRef = useRef<number>(0);
  const lastTimerClickRef = useRef<number>(0);
  const lastBedNumClickRef = useRef<number>(0);

  const isTimerActive = bed.status === BedStatus.ACTIVE && !!currentStep?.enableTimer;
  const isOvertime = isTimerActive && bed.remainingTime <= 0;
  const isNearEnd = isTimerActive && bed.remainingTime > 0 && bed.remainingTime <= 60;
  
  const handleHeaderDoubleClick = (e: React.MouseEvent) => {
    if (onEditClick) onEditClick(bed.id);
  };

  const handleHeaderTouchClick = (e: React.MouseEvent) => {
    if (window.matchMedia('(pointer: coarse)').matches) {
        const now = Date.now();
        if (now - lastHeaderClickRef.current < 350) {
            if (onEditClick) onEditClick(bed.id);
            lastHeaderClickRef.current = 0;
        } else {
            lastHeaderClickRef.current = now;
        }
    }
  };

  const handleTimerDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isTimerActive || !onUpdateDuration) return;
    setIsEditingTimer(true);
  };

  const handleTimerTouchClick = (e: React.MouseEvent) => {
    if (window.matchMedia('(pointer: coarse)').matches) {
        const now = Date.now();
        if (now - lastTimerClickRef.current < 350) {
            e.preventDefault();
            e.stopPropagation();
            if (isTimerActive && onUpdateDuration) setIsEditingTimer(true);
            lastTimerClickRef.current = 0;
        } else {
            lastTimerClickRef.current = now;
        }
    }
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
    if (bed.status === BedStatus.IDLE) return;
    setMovingPatientState({ bedId: bed.id, x: e.clientX, y: e.clientY });
  };

  const handleBedNumberTouchClick = (e: React.MouseEvent) => {
    if (window.matchMedia('(pointer: coarse)').matches) {
        const now = Date.now();
        if (now - lastBedNumClickRef.current < 350) {
            e.preventDefault();
            e.stopPropagation();
            if (bed.status !== BedStatus.IDLE) {
               setMovingPatientState({ bedId: bed.id, x: e.clientX, y: e.clientY });
            }
            lastBedNumClickRef.current = 0;
        } else {
            lastBedNumClickRef.current = now;
        }
    }
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatusMenuPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div 
        className={`flex items-center justify-between px-1.5 sm:px-2 py-0.5 sm:py-1 lg:px-3 lg:py-3 shrink-0 relative transition-colors ${getBedHeaderStyles(bed)}`}
        onDoubleClick={handleHeaderDoubleClick}
        onClick={handleHeaderTouchClick}
      >
        
        {/* Left: Bed Number & Status Icons */}
        <BedNumberAndStatus 
          bed={bed} 
          onMovePatient={handleBedNumberDoubleClick}
          onMovePatientClick={handleBedNumberTouchClick}
          onEditStatus={handleStatusClick} 
        />

        {/* Right Section: Timer & Actions */}
        <div className="flex-1 flex justify-end items-center gap-0 sm:gap-1 lg:gap-2 pl-0 sm:pl-2">
          <BedTimer 
            bed={bed}
            isTimerActive={isTimerActive}
            isOvertime={isOvertime}
            isNearEnd={isNearEnd}
            onTimerClick={handleTimerDoubleClick}
            onTimerTouchClick={handleTimerTouchClick}
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
