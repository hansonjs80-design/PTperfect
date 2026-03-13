
import React, { memo, useState, useRef, useEffect } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import { EditableCell } from './EditableCell';
import { BedSelectorCell } from './BedSelectorCell';
import { TreatmentSelectorCell } from './TreatmentSelectorCell';
import { PatientStatusCell } from './PatientStatusCell';
import { AuthorSelectorCell } from './AuthorSelectorCell';
import { BedState, PatientVisit, Preset, TreatmentStep, QuickTreatment } from '../../types';
import { useGridNavigation } from '../../hooks/useGridNavigation';
import { formatBodyPartText } from '../../utils/patientLogUtils';
import { useTreatmentContext } from '../../contexts/TreatmentContext';
import { formatTime, generateTreatmentString } from '../../utils/bedUtils';

interface PatientLogRowProps {
  rowIndex: number;
  visit?: PatientVisit;
  isDraft?: boolean;
  rowStatus?: 'active' | 'completed' | 'none';
  onUpdate?: (id: string, updates: Partial<PatientVisit>, skipBedSync?: boolean) => void | Promise<void>;
  onDelete?: (id: string) => void;
  onCreate?: (updates: Partial<PatientVisit>, colIndex?: number, navDirection?: 'down' | 'right' | 'left') => Promise<string>;
  onSelectLog?: (id: string, bedId?: number | null) => void;
  onMovePatient?: (visitId: string, currentBedId: number, newBedId: number) => void;
  onEditActive?: (bedId: number) => void;
  activeBedIds?: number[];
  activeStepColor?: string;
  activeStepBgColor?: string;
  activeStepIndex?: number;
  isLastStep?: boolean;
  timerStatus?: 'normal' | 'warning' | 'overtime';
  remainingTime?: number;
  bed?: BedState;
  presets?: Preset[];
  isPaused?: boolean;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  onClearBed?: () => void;
  onBulkAuthorUpdate?: (val: string) => void;
  showTimerColumn?: boolean;
}

export const PatientLogRow: React.FC<PatientLogRowProps> = memo(({
  rowIndex,
  visit,
  isDraft = false,
  rowStatus = 'none',
  onUpdate,
  onDelete,
  onCreate,
  onSelectLog,
  onMovePatient,
  onEditActive,
  activeBedIds = [],
  activeStepColor,
  activeStepBgColor,
  activeStepIndex = -1,
  isLastStep = false,
  timerStatus = 'normal',
  remainingTime,
  bed,
  presets = [],
  isPaused,
  onNextStep,
  onPrevStep,
  onClearBed,
  onBulkAuthorUpdate,
  showTimerColumn = false
}) => {
  const { handleGridKeyDown } = useGridNavigation(10);
  const { activateVisitFromLog, togglePause, updateBedSteps, quickTreatments } = useTreatmentContext();
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle');
  const [optimisticTreatmentName, setOptimisticTreatmentName] = useState<string | null>(null);
  const [stickyTreatmentName, setStickyTreatmentName] = useState<string>('');
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (optimisticTreatmentName === null) return;

    const optimisticTrimmed = optimisticTreatmentName.trim();
    const visitTrimmed = (visit?.treatment_name || '').trim();

    if (visitTrimmed === optimisticTrimmed) {
      setOptimisticTreatmentName(null);
    }
  }, [optimisticTreatmentName, visit?.treatment_name]);

  useEffect(() => {
    const current = visit?.treatment_name?.trim() || '';
    if (current) {
      setStickyTreatmentName(current);
      return;
    }

    // 비활성 행에서는 동기화 지연 중에도 마지막 처방명을 유지한다.
    if (rowStatus !== 'active') return;

    setStickyTreatmentName('');
  }, [visit?.treatment_name, visit?.bed_id, rowStatus]);


  const handleAssign = async (newBedId: number) => {
    // Convert 0 (from "Unassign" button) to null for DB
    const bedIdToSave = newBedId === 0 ? null : newBedId;
    const fallbackTreatmentName = (optimisticTreatmentName?.trim() || stickyTreatmentName.trim());
    const hasPersistedTreatment = !!visit?.treatment_name && visit.treatment_name.trim() !== '';
    const updates: Partial<PatientVisit> = {
      bed_id: bedIdToSave,
      ...(bedIdToSave && !hasPersistedTreatment && fallbackTreatmentName
        ? { treatment_name: fallbackTreatmentName }
        : {}),
    };

    if (isDraft && onCreate) {
      await onCreate(updates, 0);
    } else if (!isDraft && visit && onUpdate) {
      onUpdate(visit.id, updates);
    }
  };

  const handleMove = (newBedId: number) => {
    // If selecting 0 (Unassign), we move to "no bed" which effectively is clearing the assignment.
    // However, onMovePatient usually expects a valid bed ID to move TO.
    // If newBedId is 0, we treat it as "Assign to null" logic handled by onUpdate instead of move logic if possible,
    // OR allow movePatient to handle 0 as "remove from bed".
    // For now, we route 0 to standard update (unassign) if the API supports it, or let movePatient handle it.
    // Given the context, 'move' implies bed-to-bed. If unassigning, we use onUpdate logic usually.

    if (newBedId === 0) {
      if (!isDraft && visit && onUpdate) {
        onUpdate(visit.id, { bed_id: null });
      }
      return;
    }

    if (!isDraft && visit && visit.bed_id && onMovePatient) {
      onMovePatient(visit.id, visit.bed_id, newBedId);
    }
  };

  const handleUpdateLogOnly = (newBedId: number) => {
    const bedIdToSave = newBedId === 0 ? null : newBedId;
    if (!isDraft && visit && onUpdate) {
      onUpdate(visit.id, { bed_id: bedIdToSave }, true);
    }
  };

  const handleChange = async (field: keyof PatientVisit, value: string, _skipSync: boolean, colIndex: number, navDirection?: 'down' | 'right' | 'left') => {
    if (isDraft && onCreate) {
      await onCreate({ [field]: value }, colIndex, navDirection);
    } else if (!isDraft && visit && onUpdate) {
      // 배드번호/처방목록 외 환자로그 텍스트 셀은 항상 로그만 수정한다.
      // (활성 배드/타이머 상태에는 절대 영향 주지 않음)
      onUpdate(visit.id, { [field]: value }, true);
    }
  };

  const handleTreatmentTextCommit = async (val: string) => {
    setOptimisticTreatmentName(val);
    setStickyTreatmentName(val.trim());

    if (isDraft && onCreate) {
      await onCreate({ treatment_name: val }, 3);
      return;
    }

    if (!isDraft && visit && onUpdate) {
      const isAssignmentMode = !!visit.bed_id && (!visit.treatment_name || visit.treatment_name.trim() === '');
      const shouldSyncActiveBed = rowStatus === 'active' && !!visit.bed_id;
      await Promise.resolve(onUpdate(visit.id, { treatment_name: val }, !(isAssignmentMode || shouldSyncActiveBed)));
    }
  };

  const hasMeaningfulTreatmentName = (name?: string | null) => Boolean(name?.trim());

  const handleTreatmentSelectorOpen = async () => {
    const bedId = visit?.bed_id ?? null;
    const hasBed = typeof bedId === 'number';
    const hasTreatment = hasMeaningfulTreatmentName(visit?.treatment_name);

    if (isDraft && onCreate) {
      const newId = await onCreate({}, 3);
      if (onSelectLog) onSelectLog(newId);
      return;
    }

    // 처방이 이미 있는 경우: 배드카드 설정 버튼과 동일한 "설정 및 수정" 창으로 진입
    if (!isDraft && hasBed && hasTreatment && onEditActive) {
      onEditActive(bedId);
      return;
    }

    if (!isDraft && visit && onSelectLog) {
      if (hasBed) {
        onSelectLog(visit.id, bedId);
      } else {
        onSelectLog(visit.id, null);
      }
    }
  };








  const replaceStepAt = (steps: TreatmentStep[], idx: number, qt: QuickTreatment): TreatmentStep[] => {
    const next = [...steps];
    next[idx] = {
      ...next[idx],
      id: next[idx]?.id || crypto.randomUUID(),
      name: qt.name,
      label: qt.label,
      duration: Math.max(1, Math.round(qt.duration * 60)),
      enableTimer: qt.enableTimer,
      color: qt.color,
    };
    return next;
  };

  const moveStep = (steps: TreatmentStep[], idx: number, direction: 'left' | 'right'): TreatmentStep[] => {
    const target = direction === 'left' ? idx - 1 : idx + 1;
    if (target < 0 || target >= steps.length) return steps;
    const next = [...steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    return next;
  };

  const removeStepAt = (steps: TreatmentStep[], idx: number): TreatmentStep[] => {
    if (idx < 0 || idx >= steps.length) return steps;
    return steps.filter((_, i) => i !== idx);
  };

  const handleQuickActivate = async (forceRestart: boolean = false) => {
    if (isDraft || !visit) return;

    if (onUpdate) {
      const reorderTimestamp = new Date().toISOString();
      await Promise.resolve(onUpdate(visit.id, { created_at: reorderTimestamp }, true));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    activateVisitFromLog(visit.id, forceRestart);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteStep === 'idle') {
      setDeleteStep('confirm');
      // Auto-revert after 3 seconds
      deleteTimeoutRef.current = setTimeout(() => {
        setDeleteStep('idle');
      }, 3000);
    } else {
      if (!isDraft && visit && onDelete) {
        onDelete(visit.id);
      }
      setDeleteStep('idle');
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    }
  };

  const handleDeleteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // On keyboard enter, trigger same logic as click
      if (deleteStep === 'idle') {
        setDeleteStep('confirm');
        deleteTimeoutRef.current = setTimeout(() => {
          setDeleteStep('idle');
        }, 3000);
      } else {
        if (!isDraft && visit && onDelete) {
          onDelete(visit.id);
        }
        setDeleteStep('idle');
      }
    } else if (e.key === 'Escape') {
      if (deleteStep === 'confirm') {
        setDeleteStep('idle');
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
      }
    } else {
      handleGridKeyDown(e, rowIndex, 9);
    }
  };

  // Row Styling Logic
  // Using transition-colors for smooth hover effect
  let rowClasses = 'group transition-colors duration-150 border-b border-slate-200 dark:border-slate-700 h-[36px] ';

  if (rowStatus === 'active') {
    // Active Row: Blue tint -> Darker Blue on Hover
    rowClasses += 'bg-sky-50/70 dark:bg-sky-900/10 hover:bg-sky-100/80 dark:hover:bg-sky-900/20';
  } else if (rowStatus === 'completed') {
    // Completed Row: Gray tint -> Darker Gray on Hover
    rowClasses += 'bg-slate-50/80 dark:bg-slate-800/55 opacity-85 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700/80';
  } else {
    // Default Row: White -> Distinct Gray on Hover
    rowClasses += 'bg-white/95 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70';
  }

  if (isDraft) {
    rowClasses += ' opacity-60 hover:opacity-100';
  }

  const isNoBedAssigned = !visit?.bed_id;
  const hasTreatment = hasMeaningfulTreatmentName(visit?.treatment_name);
  const isLogEditMode = !isDraft && !!visit?.bed_id && hasTreatment && rowStatus !== 'active';

  let dotColorClass = 'bg-brand-500';
  if (timerStatus === 'warning') dotColorClass = 'bg-orange-500';
  if (timerStatus === 'overtime') dotColorClass = 'bg-red-600 animate-pulse';

  const cellBorderClass = "border-r border-slate-200 dark:border-slate-700";
  const currentPreset = bed?.customPreset || presets.find(p => p.id === bed?.currentPresetId);
  const currentStep = currentPreset?.steps[bed?.currentStepIndex || 0];
  const activeSteps = currentPreset?.steps || [];
  const canInteractActiveSteps = !isDraft && rowStatus === 'active' && !!bed && activeSteps.length > 0;

  const commitActiveSteps = (steps: TreatmentStep[], preferredIndex?: number) => {
    if (!bed) return;
    const safeIndex = Math.min(Math.max(preferredIndex ?? bed.currentStepIndex, 0), Math.max(0, steps.length - 1));
    updateBedSteps(bed.id, steps, safeIndex);
  };

  const handleDeleteActiveStep = (idx: number) => {
    if (!canInteractActiveSteps || !bed || activeSteps.length <= 1) return;
    const next = removeStepAt(activeSteps, idx);
    const nextIndex = idx < bed.currentStepIndex ? bed.currentStepIndex - 1 : bed.currentStepIndex;
    commitActiveSteps(next, nextIndex);
  };

  const handleMoveActiveStep = (idx: number, direction: 'left' | 'right') => {
    if (!canInteractActiveSteps || !bed) return;
    const target = direction === 'left' ? idx - 1 : idx + 1;
    if (target < 0 || target >= activeSteps.length) return;
    const next = moveStep(activeSteps, idx, direction);
    let nextIndex = bed.currentStepIndex;
    if (bed.currentStepIndex === idx) nextIndex = target;
    else if (bed.currentStepIndex === target) nextIndex = idx;
    commitActiveSteps(next, nextIndex);
  };

  const handleSwapActiveSteps = (fromIdx: number, toIdx: number) => {
    if (!canInteractActiveSteps || !bed || fromIdx === toIdx) return;
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= activeSteps.length || toIdx >= activeSteps.length) return;
    const next = [...activeSteps];
    [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
    let nextIndex = bed.currentStepIndex;
    if (bed.currentStepIndex === fromIdx) nextIndex = toIdx;
    else if (bed.currentStepIndex === toIdx) nextIndex = fromIdx;
    commitActiveSteps(next, nextIndex);
  };

  const handleReplaceActiveStep = (idx: number, qt: QuickTreatment) => {
    if (!canInteractActiveSteps || !bed) return;
    const next = replaceStepAt(activeSteps, idx, qt);
    commitActiveSteps(next, bed.currentStepIndex);
  };
  const isTreatmentLockedByTimer = false;
  const isTimerCellActive = false;
  const activeBedTreatmentValue = currentPreset?.steps?.length
    ? generateTreatmentString(currentPreset.steps)
    : '';
  const rawVisitTreatmentValue = optimisticTreatmentName ?? visit?.treatment_name ?? '';
  const visitTreatmentValue = rawVisitTreatmentValue.trim() !== '' ? rawVisitTreatmentValue : '';
  const shouldUseStickyForNonActiveRow = rowStatus !== 'active';
  const nonActiveDisplayValue = shouldUseStickyForNonActiveRow
    ? (visitTreatmentValue || stickyTreatmentName || activeBedTreatmentValue)
    : (visitTreatmentValue || activeBedTreatmentValue);
  const treatmentDisplayValue = rowStatus === 'active'
    ? (activeBedTreatmentValue || visitTreatmentValue)
    : nonActiveDisplayValue;
  const handleTogglePauseFromTreatmentCell = (!isDraft && rowStatus === 'active' && bed)
    ? () => togglePause(bed.id)
    : undefined;
  const timerText = isTimerCellActive
    ? `${timerStatus === 'overtime' ? '+' : ''}${formatTime(remainingTime || 0)}`
    : '';
  const canStartFromTimerCell = false;

  return (
    <tr className={rowClasses}>
      <td className={`${cellBorderClass} p-0 relative`}>
        <BedSelectorCell
          gridId={`${rowIndex}-0`}
          rowIndex={rowIndex}
          colIndex={0}
          value={visit?.bed_id || null}
          rowStatus={rowStatus}
          hasTreatment={hasTreatment}
          onMove={handleMove}
          onAssign={handleAssign}
          onUpdateLogOnly={handleUpdateLogOnly}
          className={isDraft ? "opacity-50 hover:opacity-100" : ""}
          activeBedIds={activeBedIds}
          isLogEditMode={isLogEditMode}
          onQuickActivate={handleQuickActivate}
        />
        {rowStatus !== 'none' && (
          <div className="absolute top-1.5 right-1 pointer-events-none">
            {rowStatus === 'active' && (
              <div className={`w-2 h-2 rounded-full ${dotColorClass} shadow-sm transition-colors duration-300`} />
            )}
            {rowStatus === 'completed' && <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
          </div>
        )}
      </td>

      <td className={`${cellBorderClass} p-0`}>
        <EditableCell
          gridId={`${rowIndex}-1`}
          rowIndex={rowIndex}
          colIndex={1}
          value={visit?.patient_name || ''}
          placeholder=""
          menuTitle="이름 수정 (로그만 변경)"
          className={`bg-transparent justify-center text-center ${!visit?.patient_name
            ? 'font-normal text-gray-300 dark:text-gray-500'
            : 'font-black text-slate-800 dark:text-slate-100'
            } ${isDraft ? 'placeholder-gray-300 font-normal' : ''} text-[13.5px] sm:text-[14.4px]`}
          onCommit={(val, skipSync, navDir) => handleChange('patient_name', val || '', skipSync, 1, navDir)}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
        />
      </td>

      <td className={`${cellBorderClass} p-0`}>
        <EditableCell
          gridId={`${rowIndex}-2`}
          rowIndex={rowIndex}
          colIndex={2}
          value={visit?.body_part || ''}
          placeholder=""
          menuTitle="치료 부위 수정 (로그만 변경)"
          className="text-slate-700 dark:text-slate-300 font-bold bg-transparent justify-center text-center text-[12.6px] sm:text-[13.5px] xl:text-[14.4px]"
          onCommit={(val, skipSync, navDir) => {
            const formattedVal = formatBodyPartText(val || '');
            handleChange('body_part', formattedVal, skipSync, 2, navDir);
          }}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
        />
      </td>

      <td className={`${cellBorderClass} p-0 relative`}>
        <TreatmentSelectorCell
          gridId={`${rowIndex}-3`}
          rowIndex={rowIndex}
          colIndex={3}
          visit={visit}
          value={treatmentDisplayValue}
          placeholder="처방 입력..."
          rowStatus={rowStatus}
          onCommitText={handleTreatmentTextCommit}
          onOpenSelector={handleTreatmentSelectorOpen}
          directSelector={isNoBedAssigned || !hasTreatment || isLogEditMode}
          activeStepColor={activeStepColor}
          activeStepBgColor={activeStepBgColor}
          activeStepIndex={activeStepIndex}
          isLastStep={isLastStep}
          timerStatus={timerStatus}
          remainingTime={remainingTime}
          isPaused={isPaused}
          onNextStep={onNextStep}
          onPrevStep={onPrevStep}
          onClearBed={onClearBed}
          onTogglePause={handleTogglePauseFromTreatmentCell}
          enableStepInteraction={canInteractActiveSteps}
          quickTreatments={quickTreatments}
          onDeleteStep={handleDeleteActiveStep}
          onMoveStep={handleMoveActiveStep}
          onSwapSteps={handleSwapActiveSteps}
          onReplaceStep={handleReplaceActiveStep}
          onOpenFullEditor={() => bed && onEditActive?.(bed.id)}
          onAddStep={() => bed && onEditActive?.(bed.id)}
          isReadOnly={isTreatmentLockedByTimer}
        />
      </td>

      <td className={`${cellBorderClass} p-0`}>
        <EditableCell
          gridId={`${rowIndex}-4`}
          rowIndex={rowIndex}
          colIndex={4}
          value={visit?.memo || ''}
          placeholder=""
          menuTitle="메모 수정 (로그만 변경)"
          className="text-slate-700 dark:text-slate-300 font-bold bg-transparent justify-center text-center text-[11.3px] xl:text-[13px]"
          onCommit={(val, skipSync, navDir) => handleChange('memo', val || '', skipSync, 4, navDir)}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
        />
      </td>

      <td className={`${cellBorderClass} p-0 hidden`}>
        <EditableCell
          gridId={`${rowIndex}-5`}
          rowIndex={rowIndex}
          colIndex={5}
          value={visit?.special_note || ''}
          placeholder=""
          menuTitle="특이사항 수정 (로그만 변경)"
          className="text-slate-700 dark:text-slate-300 font-bold bg-transparent justify-center text-center text-[11.2px] sm:text-[12.5px]"
          onCommit={(val, skipSync, navDir) => handleChange('special_note', val || '', skipSync, 5, navDir)}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
        />
      </td>

      <td className={`${cellBorderClass} p-0 ${showTimerColumn ? "" : "hidden"}`}>
        <div
          className="w-full h-full min-h-[36px] flex items-center justify-center px-1 text-[11px] sm:text-[12px] font-black tracking-tight"
          data-grid-id={`${rowIndex}-6`}
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && canStartFromTimerCell) {
              e.preventDefault();
              handleQuickActivate(true);
              return;
            }
            handleGridKeyDown(e, rowIndex, 6);
          }}
        >
          <div className="flex items-center justify-center gap-1.5 w-full">
            {isTimerCellActive ? (
              <>
                <span className={`${timerStatus === 'overtime' ? 'text-red-600 dark:text-red-400 animate-pulse' : timerStatus === 'warning' ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {isPaused ? `일시정지 ${timerText}` : timerText}
                </span>
                {!!onClearBed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearBed();
                    }}
                    className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-black hover:bg-red-700"
                    title="타이머 종료 후 침상 비우기"
                  >
                    종료·비우기
                  </button>
                )}
              </>
            ) : canStartFromTimerCell ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickActivate(true);
                }}
                className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black hover:bg-emerald-700"
                title="해당 배드 타이머 시작"
              >
                타이머 시작
              </button>
            ) : (
              <span className="text-gray-300 dark:text-gray-600">-</span>
            )}
          </div>
        </div>
      </td>

      <td className={`${cellBorderClass} p-0`}>
        <PatientStatusCell
          gridId={`${rowIndex}-7`}
          rowIndex={rowIndex}
          colIndex={7}
          visit={visit}
          rowStatus={rowStatus}
          onUpdate={onUpdate || (() => { })}
          isDraft={isDraft}
          onCreate={onCreate}
        />
      </td>

      <td className={`${cellBorderClass} p-0`}>
        <AuthorSelectorCell
          gridId={`${rowIndex}-8`}
          rowIndex={rowIndex}
          colIndex={8}
          value={visit?.author || ''}
          onSelect={async (val) => {
            if (isDraft && onCreate) {
              await onCreate({ author: val }, 8);
            } else if (visit && onUpdate) {
              // 선택한 셀만 변경 (빈 셀이든 이미 입력된 셀이든 동일하게 처리)
              onUpdate(visit.id, { author: val }, true);
            }
          }}
          isDraft={isDraft}
        />
      </td>

      <td className="p-0 text-center w-[24px] min-w-[24px] max-w-[24px]">
        {!isDraft && visit && onDelete && (
          <div
            className="flex justify-center items-center h-full px-[4px] outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:outline-offset-[-1px]"
            tabIndex={0}
            data-grid-id={`${rowIndex}-9`}
            onKeyDown={handleDeleteKeyDown}
          >
            <button
              onClick={handleDeleteClick}
              className={`
                transition-all duration-200 active:scale-95 flex items-center justify-center
                ${deleteStep === 'idle'
                  ? 'w-4 h-4 text-gray-300 hover:text-red-500 rounded-sm'
                  : 'w-4 h-4 text-red-600 dark:text-red-400'}
              `}
              title={deleteStep === 'idle' ? "삭제 (클릭하여 확인)" : "삭제 확정"}
              tabIndex={-1}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
});
