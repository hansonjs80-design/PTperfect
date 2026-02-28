
import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { BedState, BedStatus, TreatmentStep } from '../types';
import { getBedHeaderStyles } from '../utils/styleUtils';
import { formatBodyPartText } from '../utils/patientLogUtils';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { TimerEditPopup } from './bed-card/TimerEditPopup';
import { BedStatusPopup } from './bed-card/BedStatusPopup';
import { BedNumberAndStatus } from './bed-card/BedNumberAndStatus';
import { BedTimer } from './bed-card/BedTimer';
import { useResponsiveClick } from '../hooks/useResponsiveClick';
import { PatientMemoModal } from './modals/PatientMemoModal';

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
  onToggleInjectionCompleted: (id: number) => void;
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
  onToggleManual,
  onToggleInjectionCompleted
}: BedHeaderProps) => {
  const { setMovingPatientState, bedPatientNames, bedPatientBodyParts, updatePatientMemo, updateActiveVisitFields } = useTreatmentContext();
  const patientName = bed.status !== BedStatus.IDLE ? bedPatientNames[bed.id] : undefined;
  const patientBodyPart = bed.status !== BedStatus.IDLE ? bedPatientBodyParts[bed.id] : undefined;
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBodyPart, setIsEditingBodyPart] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [bodyPartDraft, setBodyPartDraft] = useState('');
  const bodyPartInputRef = useRef<HTMLInputElement | null>(null);
  const moveFocusToBodyPartRef = useRef(false);

  useEffect(() => {
    setNameDraft(patientName || '');
  }, [patientName, bed.id]);

  useEffect(() => {
    setBodyPartDraft(patientBodyPart || '');
  }, [patientBodyPart, bed.id]);

  useEffect(() => {
    if (!isEditingBodyPart || !moveFocusToBodyPartRef.current) return;

    const id = requestAnimationFrame(() => {
      bodyPartInputRef.current?.focus();
      bodyPartInputRef.current?.select();
      moveFocusToBodyPartRef.current = false;
    });

    return () => cancelAnimationFrame(id);
  }, [isEditingBodyPart]);


  // Changed from boolean to coordinates object to support positioning
  const [timerMenuPos, setTimerMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [statusMenuPos, setStatusMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);

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

  // 4. Memo Icon Click handler via BedNumberAndStatus (BedStatusBadges intercept)
  const handleMemoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMemoModalOpen(true);
  }, []);


  const commitName = useCallback(async (raw: string) => {
    const val = raw.trim();
    setIsEditingName(false);
    if ((patientName || '') === val) return;
    await updateActiveVisitFields(bed.id, { patient_name: val });
  }, [bed.id, patientName, updateActiveVisitFields]);

  const commitBodyPart = useCallback(async (raw: string) => {
    const val = formatBodyPartText(raw.trim());
    setIsEditingBodyPart(false);
    if ((patientBodyPart || '') === val) return;
    await updateActiveVisitFields(bed.id, { body_part: val });
  }, [bed.id, patientBodyPart, updateActiveVisitFields]);


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
        className={`flex items-center justify-between px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 md:py-1.5 lg:px-3 lg:py-[9px] shrink-0 relative transition-colors ${getBedHeaderStyles(bed)}`}
      // Removed onClick/onDoubleClick to prevent popup on header background
      >

        {/* Left: Bed Number & Status Icons */}
        <BedNumberAndStatus
          bed={bed}
          onMovePatient={handleBedNumberInteraction}
          onEditStatus={handleStatusInteraction}
          onMemoClick={handleMemoClick}
        />

        {/* Right Section: Patient Name + Timer & Actions */}
        <div className="flex-1 flex justify-end items-center gap-0 sm:gap-1 lg:gap-2 pl-0 sm:pl-2">
          {bed.status !== BedStatus.IDLE && (
            <div className="hidden md:flex flex-col items-end max-w-[88px] lg:max-w-[120px] mr-1 lg:mr-2 leading-tight">
              {isEditingName ? (
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={(e) => { e.stopPropagation(); commitName(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      moveFocusToBodyPartRef.current = true;
                      commitName((e.target as HTMLInputElement).value);
                      setIsEditingBodyPart(true);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setNameDraft(patientName || '');
                      setIsEditingName(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-right bg-white/80 dark:bg-slate-700/80 border border-indigo-400 rounded px-1 text-sm md:text-base lg:text-lg font-black text-slate-700 dark:text-slate-200"
                  placeholder="이름"
                />
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }}
                  className="w-full text-right text-sm md:text-base lg:text-lg font-black text-slate-700 dark:text-slate-200 truncate"
                  title="이름 입력/수정"
                >
                  {patientName || '+ 이름'}
                </button>
              )}

              {isEditingBodyPart ? (
                <input
                  autoFocus
                  ref={bodyPartInputRef}
                  value={bodyPartDraft}
                  onChange={(e) => setBodyPartDraft(e.target.value)}
                  onBlur={(e) => { e.stopPropagation(); commitBodyPart(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitBodyPart((e.target as HTMLInputElement).value);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setBodyPartDraft(patientBodyPart || '');
                      setIsEditingBodyPart(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5 w-full text-right bg-white/80 dark:bg-slate-700/80 border border-indigo-300 rounded px-1 text-[10px] md:text-xs lg:text-sm font-bold text-slate-500 dark:text-slate-400"
                  placeholder="부위"
                />
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsEditingBodyPart(true); }}
                  className="mt-0.5 w-full text-right text-[10px] md:text-xs lg:text-sm font-bold text-slate-500 dark:text-slate-400 truncate"
                  title="부위 입력/수정"
                >
                  {patientBodyPart || '+ 부위'}
                </button>
              )}
            </div>
          )}
          <BedTimer
            bed={bed}
            isTimerActive={isTimerActive}
            isOvertime={isOvertime}
            isNearEnd={isNearEnd}
            onTimerClick={handleTimerInteraction}
            onTogglePause={handleTogglePause}
            compact={!!patientName || !!patientBodyPart}
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
          onToggleInjectionCompleted={onToggleInjectionCompleted}
          onEditMemo={() => {
            setStatusMenuPos(null);
            setIsMemoModalOpen(true);
          }}
        />
      )}
    </>
  );
});
