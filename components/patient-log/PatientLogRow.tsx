
import React, { memo, useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { EditableCell } from './EditableCell';
import { BedSelectorCell } from './BedSelectorCell';
import { TreatmentSelectorCell } from './TreatmentSelectorCell';
import { PatientStatusCell } from './PatientStatusCell';
import { AuthorSelectorCell } from './AuthorSelectorCell';
import { GenderSelectorCell } from './GenderSelectorCell';
import { BedState, PatientVisit, Preset, TreatmentStep, QuickTreatment } from '../../types';
import { useGridNavigation } from '../../hooks/useGridNavigation';
import { formatBodyPartText } from '../../utils/patientLogUtils';
import { TimerEditPopup } from '../bed-card/TimerEditPopup';
import { normalizeUpperEnglishKeyInput } from '../../utils/keyboardLayout';
import { useTreatmentContext } from '../../contexts/TreatmentContext';
import { findExactPresetByTreatmentString, formatTime, generateTreatmentString, normalizeTreatmentString, parseTreatmentString } from '../../utils/bedUtils';
import { type StatusOptionConfig } from './StatusSelectionMenu';

const persistedPresetBadgeByVisitId = new Map<string, Preset>();

interface PatientLogRowProps {
  rowIndex: number;
  isRowSelected?: boolean;
  visit?: PatientVisit;
  isDraft?: boolean;
  rowStatus?: 'active' | 'completed' | 'none';
  onUpdate?: (id: string, updates: Partial<PatientVisit>, skipBedSync?: boolean) => void | Promise<void>;
  onDelete?: (id: string) => void;
  onCreate?: (updates: Partial<PatientVisit>, colIndex?: number, navDirection?: 'down' | 'right' | 'left') => Promise<string>;
  onSelectLog?: (id: string, bedId?: number | null, options?: { append?: boolean }) => void;
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
  isBedActivationDisabled?: boolean;
  statusOptions?: StatusOptionConfig[];
  patientNameSuggestions?: string[];
  patientNameAutofillMap?: Record<string, { chart_number?: string; gender?: string }>;
  bodyPartSuggestions?: string[];
  memoSuggestions?: string[];
  specialNoteSuggestions?: string[];
}

export const PatientLogRow: React.FC<PatientLogRowProps> = memo(({
  rowIndex,
  isRowSelected = false,
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
  showTimerColumn = false,
  isBedActivationDisabled = false,
  statusOptions = [],
  patientNameSuggestions = [],
  patientNameAutofillMap = {},
  bodyPartSuggestions = [],
  memoSuggestions = [],
  specialNoteSuggestions = [],
}) => {
  const { handleGridKeyDown } = useGridNavigation(11);
  const { activateVisitFromLog, togglePause, updateBedSteps, updateBedDuration, quickTreatments } = useTreatmentContext();
  const [timerPopupPos, setTimerPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [optimisticTreatmentName, setOptimisticTreatmentName] = useState<string | null>(null);
  const [stickyTreatmentName, setStickyTreatmentName] = useState<string>('');
  const [detachedBadgeValue, setDetachedBadgeValue] = useState<string | null>(null);
  const [renamedBadgeOverride, setRenamedBadgeOverride] = useState<Preset | null>(null);
  const stickyPresetBadgeRef = useRef<Preset | null>(null);
  const latestDisplayedPresetBadgeRef = useRef<Preset | null>(null);

  useEffect(() => {
    if (!visit?.id) return;
    const persistedBadge = persistedPresetBadgeByVisitId.get(visit.id);
    if (persistedBadge) {
      stickyPresetBadgeRef.current = persistedBadge;
      latestDisplayedPresetBadgeRef.current = persistedBadge;
    }
  }, [visit?.id]);

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

  useEffect(() => {
    if (!visit) return;

    const handleClearTreatmentDisplay = (event: Event) => {
      const customEvent = event as CustomEvent<{ visitId?: string }>;
      if (customEvent.detail?.visitId !== visit.id) return;

      setOptimisticTreatmentName('');
      setStickyTreatmentName('');
      setDetachedBadgeValue(null);
      setRenamedBadgeOverride(null);
      stickyPresetBadgeRef.current = null;
      latestDisplayedPresetBadgeRef.current = null;
      persistedPresetBadgeByVisitId.delete(visit.id);
    };

    const handlePresetBadgeSelected = (event: Event) => {
      const customEvent = event as CustomEvent<{ visitId?: string; preset?: Preset }>;
      if (customEvent.detail?.visitId !== visit.id || !customEvent.detail.preset) return;

      const selectedPreset = customEvent.detail.preset;
      stickyPresetBadgeRef.current = selectedPreset;
      latestDisplayedPresetBadgeRef.current = selectedPreset;
      persistedPresetBadgeByVisitId.set(visit.id, selectedPreset);
      setDetachedBadgeValue(null);
      setRenamedBadgeOverride(null);
    };

    window.addEventListener('patient-log-clear-treatment-display', handleClearTreatmentDisplay as EventListener);
    window.addEventListener('patient-log-preset-badge-selected', handlePresetBadgeSelected as EventListener);
    return () => {
      window.removeEventListener('patient-log-clear-treatment-display', handleClearTreatmentDisplay as EventListener);
      window.removeEventListener('patient-log-preset-badge-selected', handlePresetBadgeSelected as EventListener);
    };
  }, [visit]);


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
      onUpdate(visit.id, updates, isBedActivationDisabled);
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
        onUpdate(visit.id, { bed_id: null }, isBedActivationDisabled);
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
    const normalizedValue = value.trim();
    const patientNameKey = field === 'patient_name' ? normalizedValue.toLocaleLowerCase() : '';
    const matchedAutofill = field === 'patient_name' ? patientNameAutofillMap[patientNameKey] : undefined;

    if (isDraft && onCreate) {
      await onCreate({
        [field]: value,
        ...(field === 'patient_name' && matchedAutofill?.chart_number ? { chart_number: matchedAutofill.chart_number } : {}),
        ...(field === 'patient_name' && matchedAutofill?.gender ? { gender: matchedAutofill.gender } : {}),
      }, colIndex, navDirection);
    } else if (!isDraft && visit && onUpdate) {
      // 배드번호/처방목록 외 환자로그 텍스트 셀은 항상 로그만 수정한다.
      // (활성 배드/타이머 상태에는 절대 영향 주지 않음)
      onUpdate(visit.id, {
        [field]: value,
        ...(field === 'patient_name' && matchedAutofill?.chart_number ? { chart_number: matchedAutofill.chart_number } : {}),
        ...(field === 'patient_name' && matchedAutofill?.gender ? { gender: matchedAutofill.gender } : {}),
      }, true);
    }
  };

  const buildStatusUpdatesFromTreatment = (treatmentText: string): Partial<PatientVisit> => {
    const normalized = treatmentText.trim();
    if (!normalized) return {};

    const matchedOptions = statusOptions.filter((option) => normalized.includes(option.label));
    if (matchedOptions.length === 0) return {};

    const updates: Partial<PatientVisit> = {};
    const nextCustomStatuses = [...(visit?.custom_statuses || [])];

    matchedOptions.forEach((option) => {
      if (option.kind === 'predefined' && option.key) {
        updates[option.key] = true;
        return;
      }

      if (option.kind === 'custom' && !nextCustomStatuses.some((status) => status.id === option.id)) {
        nextCustomStatuses.push({
          id: option.id,
          label: option.label,
          color: option.color,
          order: option.order,
        });
      }
    });

    if (nextCustomStatuses.length > 0) {
      updates.custom_statuses = nextCustomStatuses.sort((a, b) => a.order - b.order);
    }

    return updates;
  };

  const findPresetByLeadingToken = (treatmentText: string) => {
    const normalized = treatmentText.trim().toLowerCase();
    if (!normalized) return null;

    const leadingToken = normalized.split(/[()[\]\/,+\-\s]+/).find(Boolean) || normalized;
    return presets.find((preset) => {
      const presetName = preset.name.trim().toLowerCase();
      return presetName.startsWith(leadingToken);
    }) || null;
  };

  const handleTreatmentTextCommit = async (val: string) => {
    const normalizedTreatment = val.trim();
    const matchedPreset = normalizedTreatment
      ? (findExactPresetByTreatmentString(presets, normalizedTreatment, quickTreatments) || findPresetByLeadingToken(normalizedTreatment) || null)
      : null;
    const committedTreatment = matchedPreset ? generateTreatmentString(matchedPreset.steps) : normalizedTreatment;
    const fallbackPresetBadge = latestDisplayedPresetBadgeRef.current ?? stickyPresetBadgeRef.current;
    const statusUpdates = buildStatusUpdatesFromTreatment(committedTreatment);

    setOptimisticTreatmentName(committedTreatment);
    setStickyTreatmentName(committedTreatment);

    if (committedTreatment) {
      setDetachedBadgeValue(null);
    }

    if (matchedPreset) {
      stickyPresetBadgeRef.current = matchedPreset;
      if (visit?.id) persistedPresetBadgeByVisitId.set(visit.id, matchedPreset);
      setRenamedBadgeOverride(null);
    } else if (committedTreatment && fallbackPresetBadge) {
      stickyPresetBadgeRef.current = fallbackPresetBadge;
      if (visit?.id) persistedPresetBadgeByVisitId.set(visit.id, fallbackPresetBadge);
    } else if (!committedTreatment) {
      stickyPresetBadgeRef.current = null;
      latestDisplayedPresetBadgeRef.current = null;
      if (visit?.id) persistedPresetBadgeByVisitId.delete(visit.id);
      setDetachedBadgeValue(null);
      setRenamedBadgeOverride(null);
    }

    if (isDraft && onCreate) {
      await onCreate({ treatment_name: committedTreatment, ...statusUpdates }, 3);
      return;
    }

    if (!isDraft && visit && onUpdate) {
      const isAssignmentMode = !!visit.bed_id && (!visit.treatment_name || visit.treatment_name.trim() === '');
      const shouldSyncActiveBed = !isBedActivationDisabled && rowStatus === 'active' && !!visit.bed_id;
      await Promise.resolve(onUpdate(visit.id, { treatment_name: committedTreatment, ...statusUpdates }, !(isAssignmentMode || shouldSyncActiveBed)));

      // 활성 행 처방을 명시적으로 지우면 배드 카드/행도 즉시 비활성화한다.
      if (!isBedActivationDisabled && committedTreatment === '' && rowStatus === 'active' && visit.bed_id) {
        onClearBed?.();
      }
    }
  };

  const hasMeaningfulTreatmentName = (name?: string | null) => Boolean(name?.trim());

  const handleTreatmentSelectorOpen = async () => {
    document.body.dataset.patientLogModalReturnGridId = `${rowIndex}-5`;
    window.dispatchEvent(new CustomEvent('patient-log-force-selection', {
      detail: { row: rowIndex, col: 5 }
    }));
    const bedId = visit?.bed_id ?? null;
    const hasBed = typeof bedId === 'number';
    const hasTreatment = hasMeaningfulTreatmentName(visit?.treatment_name);

    if (isDraft && onCreate) {
      const newId = await onCreate({}, 3);
      if (onSelectLog) onSelectLog(newId);
      return;
    }

    // 처방이 이미 있는 경우: 배드카드 설정 버튼과 동일한 "설정 및 수정" 창으로 진입
    if (!isBedActivationDisabled && !isDraft && hasBed && hasTreatment && onEditActive) {
      onEditActive(bedId);
      return;
    }

    if (!isDraft && visit && onSelectLog) {
      if (hasBed && !isBedActivationDisabled) {
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

  const appendStepAtEnd = (steps: TreatmentStep[], qt: QuickTreatment): TreatmentStep[] => {
    const nextStep: TreatmentStep = {
      id: crypto.randomUUID(),
      name: qt.name,
      label: qt.label,
      duration: Math.max(1, Math.round(qt.duration * 60)),
      enableTimer: qt.enableTimer,
      color: qt.color,
    };
    return [...steps, nextStep];
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

  // Row Styling Logic
  // Using transition-colors for smooth hover effect
  let rowClasses = 'group transition-colors duration-150 border-b border-slate-300 dark:border-slate-600 h-[32px] ';

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
  const isLogEditMode = !isDraft && (isBedActivationDisabled || (!!visit?.bed_id && hasTreatment && rowStatus !== 'active'));

  let dotColorClass = 'bg-brand-500';
  if (timerStatus === 'warning') dotColorClass = 'bg-orange-500';
  if (timerStatus === 'overtime') dotColorClass = 'bg-red-600 animate-pulse';

  const cellBorderClass = "border-r border-slate-300 dark:border-slate-600";
  const rowHeaderClass = isRowSelected
    ? 'bg-sky-200 dark:bg-sky-900/45 text-sky-800 dark:text-sky-100'
    : 'bg-slate-200/90 dark:bg-slate-800/85 text-slate-500 dark:text-slate-400 hover:bg-slate-300/90 dark:hover:bg-slate-700/90';
  const currentPreset = bed?.customPreset || presets.find(p => p.id === bed?.currentPresetId);
  const currentStep = currentPreset?.steps[bed?.currentStepIndex || 0];
  const activeSteps = currentPreset?.steps || [];
  const canInteractActiveSteps = !isDraft && !isBedActivationDisabled && rowStatus === 'active' && !!bed && activeSteps.length > 0;

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


  const handleAddStepFromButton = (qt: QuickTreatment) => {
    if (!bed || !canInteractActiveSteps) return;
    const next = appendStepAtEnd(activeSteps, qt);
    commitActiveSteps(next, bed.currentStepIndex);
  };

  const commitInactiveSteps = (steps: TreatmentStep[]) => {
    void handleTreatmentTextCommit(generateTreatmentString(steps));
  };

  const handleDeleteInactiveStep = (idx: number) => {
    if (!canInteractInactiveSteps) return;
    const next = removeStepAt(displayedSteps, idx);
    commitInactiveSteps(next);
  };

  const handleMoveInactiveStep = (idx: number, direction: 'left' | 'right') => {
    if (!canInteractInactiveSteps) return;
    const next = moveStep(displayedSteps, idx, direction);
    commitInactiveSteps(next);
  };

  const handleSwapInactiveSteps = (fromIdx: number, toIdx: number) => {
    if (!canInteractInactiveSteps || fromIdx === toIdx) return;
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= displayedSteps.length || toIdx >= displayedSteps.length) return;
    const next = [...displayedSteps];
    [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
    commitInactiveSteps(next);
  };

  const handleReplaceInactiveStep = (idx: number, qt: QuickTreatment) => {
    if (!canInteractInactiveSteps) return;
    const next = replaceStepAt(displayedSteps, idx, qt);
    commitInactiveSteps(next);
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
    ? (visitTreatmentValue || activeBedTreatmentValue)
    : nonActiveDisplayValue;

  const displayedSteps = parseTreatmentString(treatmentDisplayValue, quickTreatments);
  const canInteractInactiveSteps = !isDraft && (rowStatus !== 'active' || isBedActivationDisabled) && displayedSteps.length > 0;
  const canInteractTreatmentSteps = canInteractActiveSteps || canInteractInactiveSteps;

  const activeBasePreset = bed?.currentPresetId ? presets.find((p) => p.id === bed.currentPresetId) : undefined;
  const isActivePresetModified = (() => {
    if (!(rowStatus === 'active' && currentPreset?.name === '치료(수정됨)' && activeBasePreset)) {
      return false;
    }

    // 세트와 현재 처방 문자열이 동일한 처방 내역인지(이름/항목 기준, 순서 무관) 확인한다.
    const targetNorm = displayedSteps.map((s) => s.name).sort().join('/');
    const baseNorm = activeBasePreset.steps.map((s) => s.name).sort().join('/');
    return !!targetNorm && targetNorm !== baseNorm;
  })();

  const matchedPresetForDisplay = (() => {
    const normalized = treatmentDisplayValue.trim();
    if (detachedBadgeValue === normalized) return null;

    // 사용자가 우클릭으로 배지 이름을 명시적으로 변경한 경우 최우선 적용
    if (renamedBadgeOverride) return renamedBadgeOverride;

    // 처방 문자열이 같은 다른 세트가 있어도, 사용자가 마지막으로 선택한 세트 배지를 우선 유지한다.
    if (normalized && stickyPresetBadgeRef.current) {
      return stickyPresetBadgeRef.current;
    }

    const presetMatchedFromDisplay = normalized
      ? (findExactPresetByTreatmentString(presets, normalized, quickTreatments) || null)
      : null;

    if (rowStatus === 'active') {
      // 세트 처방이 변경되면(특히 플레이 직후 동기화 지연 구간) 문자열 기준 세트명을 우선 반영한다.
      if (presetMatchedFromDisplay) return presetMatchedFromDisplay;

      if (currentPreset) {
        if (isActivePresetModified && activeBasePreset) {
          return {
            ...currentPreset,
            name: activeBasePreset.name,
            color: activeBasePreset.color || currentPreset.color,
            textColor: activeBasePreset.textColor || currentPreset.textColor,
          };
        }
        return currentPreset;
      }
    }

    return presetMatchedFromDisplay;
  })();

  useEffect(() => {
    if (!treatmentDisplayValue.trim()) {
      latestDisplayedPresetBadgeRef.current = null;
      if (visit?.id) persistedPresetBadgeByVisitId.delete(visit.id);
      return;
    }
    if (!matchedPresetForDisplay) return;
    latestDisplayedPresetBadgeRef.current = matchedPresetForDisplay;
    stickyPresetBadgeRef.current = matchedPresetForDisplay;
    if (visit?.id) persistedPresetBadgeByVisitId.set(visit.id, matchedPresetForDisplay);
  }, [matchedPresetForDisplay, treatmentDisplayValue, visit?.id]);

  const handleOpenTimerEdit = (position: { x: number; y: number }) => {
    if (!bed) return;
    setTimerPopupPos(position);
  };

  const handleTimerDurationConfirm = (seconds: number) => {
    if (!bed) return;
    updateBedDuration(bed.id, seconds);
    setTimerPopupPos(null);
  };

  const handleTogglePauseFromTreatmentCell = (!isDraft && rowStatus === 'active' && bed)
    ? () => togglePause(bed.id)
    : undefined;
  const timerText = isTimerCellActive
    ? `${timerStatus === 'overtime' ? '+' : ''}${formatTime(remainingTime || 0)}`
    : '';
  const canStartFromTimerCell = false;

  return (
    <>
      <tr className={rowClasses}>
      <td className={`p-0 border-r border-slate-300 dark:border-slate-600 ${rowHeaderClass}`}>
        <button
          type="button"
          data-row-header-id={rowIndex}
          tabIndex={-1}
          className="w-full h-full min-h-[32px] min-w-[34px] flex items-center justify-center text-[10px] font-black select-none transition-colors"
          title="행 선택"
        >
          {rowIndex + 1}
        </button>
      </td>
      <td data-grid-cell-id={`${rowIndex}-0`} className={`${cellBorderClass} p-0 relative`}>
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
          onQuickActivate={isBedActivationDisabled ? undefined : handleQuickActivate}
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

      <td data-grid-cell-id={`${rowIndex}-1`} className={`${cellBorderClass} p-0`}>
        <EditableCell
          gridId={`${rowIndex}-1`}
          rowIndex={rowIndex}
          colIndex={1}
          value={visit?.chart_number || ''}
          placeholder=""
          menuTitle="차트 번호 수정 (로그만 변경)"
          className={`bg-transparent justify-center text-center font-black text-slate-800 dark:text-slate-100 ${isDraft ? 'placeholder-gray-300' : ''} text-[13.5px] sm:text-[14.4px]`}
          onCommit={(val, skipSync, navDir) => handleChange('chart_number', val || '', skipSync, 1, navDir)}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
        />
      </td>

      <td data-grid-cell-id={`${rowIndex}-2`} className={`${cellBorderClass} p-0`}>
        <EditableCell
          gridId={`${rowIndex}-2`}
          rowIndex={rowIndex}
          colIndex={2}
          value={visit?.patient_name || ''}
          placeholder=""
          menuTitle="이름 수정 (로그만 변경)"
          className={`bg-transparent justify-center text-center font-black text-slate-800 dark:text-slate-100 ${isDraft ? 'placeholder-gray-300' : ''} text-[13.5px] sm:text-[14.4px]`}
          onCommit={(val, skipSync, navDir) => handleChange('patient_name', val || '', skipSync, 2, navDir)}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
          suggestionOptions={patientNameSuggestions}
        />
      </td>

      <td data-grid-cell-id={`${rowIndex}-3`} className={`${cellBorderClass} p-0`}>
        <GenderSelectorCell
          gridId={`${rowIndex}-3`}
          rowIndex={rowIndex}
          colIndex={3}
          value={(visit?.gender || '').toUpperCase()}
          onSelect={async (val) => {
            if (isDraft && onCreate) {
              await onCreate({ gender: val }, 3);
            } else if (visit && onUpdate) {
              onUpdate(visit.id, { gender: val }, true);
            }
          }}
        />
      </td>

      <td data-grid-cell-id={`${rowIndex}-4`} className={`${cellBorderClass} p-0`}>
        <EditableCell
          gridId={`${rowIndex}-4`}
          rowIndex={rowIndex}
          colIndex={4}
          value={visit?.body_part || ''}
          placeholder=""
          menuTitle="치료 부위 수정 (로그만 변경)"
          className="text-slate-700 dark:text-slate-300 font-bold bg-transparent justify-center text-center text-[12.6px] sm:text-[13.5px] xl:text-[14.4px]"
          onCommit={(val, skipSync, navDir) => {
            const formattedVal = formatBodyPartText(val || '');
            handleChange('body_part', formattedVal, skipSync, 4, navDir);
          }}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
          suggestionOptions={bodyPartSuggestions}
        />
      </td>

      <td data-grid-cell-id={`${rowIndex}-5`} className={`${cellBorderClass} p-0 relative`}>
        <TreatmentSelectorCell
          gridId={`${rowIndex}-5`}
          rowIndex={rowIndex}
          colIndex={5}
          visit={visit}
          value={treatmentDisplayValue}
          placeholder=""
          rowStatus={rowStatus}
          onCommitText={handleTreatmentTextCommit}
          onOpenSelector={handleTreatmentSelectorOpen}
          presetLabel={matchedPresetForDisplay?.name}
          presetColor={matchedPresetForDisplay?.color || matchedPresetForDisplay?.steps?.[0]?.color || 'bg-brand-500'}
          presetTextColor={matchedPresetForDisplay?.textColor}
          presetIsModified={isActivePresetModified}
          onDeletePresetBadge={() => {
            setDetachedBadgeValue(treatmentDisplayValue.trim());
            setRenamedBadgeOverride(null);
            stickyPresetBadgeRef.current = null;
          }}
          presets={presets}
          onRenamePresetBadge={(newPreset) => {
            // 배지 이름/색만 로컬에서 덮어쓰기 (처방 항목은 유지)
            setRenamedBadgeOverride(newPreset);
            setDetachedBadgeValue(null);
          }}
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
          onOpenTimerEdit={handleOpenTimerEdit}
          enableStepInteraction={canInteractTreatmentSteps}
          quickTreatments={quickTreatments}
          onDeleteStep={rowStatus === 'active' && !isBedActivationDisabled ? handleDeleteActiveStep : handleDeleteInactiveStep}
          onMoveStep={rowStatus === 'active' && !isBedActivationDisabled ? handleMoveActiveStep : handleMoveInactiveStep}
          onSwapSteps={rowStatus === 'active' && !isBedActivationDisabled ? handleSwapActiveSteps : handleSwapInactiveSteps}
          onReplaceStep={rowStatus === 'active' && !isBedActivationDisabled ? handleReplaceActiveStep : handleReplaceInactiveStep}
          onOpenFullEditor={handleTreatmentSelectorOpen}
          onAddStep={isBedActivationDisabled ? undefined : handleAddStepFromButton}
          isReadOnly={isTreatmentLockedByTimer}
          preferInlineTextEditing={isBedActivationDisabled}
        />
      </td>

      <td data-grid-cell-id={`${rowIndex}-6`} className={`${cellBorderClass} p-0`}>
        <PatientStatusCell
          gridId={`${rowIndex}-6`}
          rowIndex={rowIndex}
          colIndex={6}
          visit={visit}
          rowStatus={rowStatus}
          onUpdate={onUpdate || (() => { })}
          disableBedSync={isBedActivationDisabled}
          isDraft={isDraft}
          onCreate={onCreate}
        />
      </td>

      <td data-grid-cell-id={`${rowIndex}-7`} className={`${cellBorderClass} p-0`}>
        <EditableCell
          gridId={`${rowIndex}-7`}
          rowIndex={rowIndex}
          colIndex={7}
          value={visit?.memo || ''}
          placeholder=""
          menuTitle="메모 수정 (로그만 변경)"
          className="text-slate-700 dark:text-slate-300 font-bold bg-transparent justify-center text-center text-[11.3px] xl:text-[13px]"
          onCommit={(val, skipSync, navDir) => handleChange('memo', val || '', skipSync, 7, navDir)}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
          suggestionOptions={memoSuggestions}
        />
      </td>

      <td data-grid-cell-id={`${rowIndex}-8`} className={`${cellBorderClass} p-0`}>
        <EditableCell
          gridId={`${rowIndex}-8`}
          rowIndex={rowIndex}
          colIndex={8}
          value={visit?.special_note || ''}
          placeholder=""
          menuTitle="특이사항 수정 (로그만 변경)"
          className="text-slate-700 dark:text-slate-300 font-bold bg-transparent justify-center text-center text-[11.2px] sm:text-[12.5px]"
          onCommit={(val, skipSync, navDir) => handleChange('special_note', val || '', skipSync, 8, navDir)}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
          suggestionOptions={specialNoteSuggestions}
        />
      </td>

      <td data-grid-cell-id={`${rowIndex}-9`} className={`${cellBorderClass} p-0 ${showTimerColumn ? "" : "hidden"}`}>
        <div
          className="w-full h-full min-h-[32px] flex items-center justify-center px-1 text-[11px] sm:text-[12px] font-black tracking-tight"
          data-grid-id={`${rowIndex}-9`}
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && canStartFromTimerCell) {
              e.preventDefault();
              handleQuickActivate(true);
              return;
            }
            handleGridKeyDown(e, rowIndex, 9);
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

      <td data-grid-cell-id={`${rowIndex}-10`} className="p-0 align-middle text-center min-w-[56px] w-[56px] max-w-[56px] xl:w-[68px] xl:max-w-[68px] border-r border-slate-300 dark:border-slate-600">
        <div className="relative w-full h-full min-h-[32px]">
          <AuthorSelectorCell
            gridId={`${rowIndex}-10`}
            rowIndex={rowIndex}
            colIndex={10}
            value={visit?.author || ''}
            onSelect={async (val) => {
              const normalizedAuthor = normalizeUpperEnglishKeyInput(val).slice(0, 4);
              if (isDraft && onCreate) {
                await onCreate({ author: normalizedAuthor }, 10);
              } else if (visit && onUpdate) {
                // 선택한 셀만 변경 (빈 셀이든 이미 입력된 셀이든 동일하게 처리)
                onUpdate(visit.id, { author: normalizedAuthor }, true);
              }
            }}
            isDraft={isDraft}
          />
        </div>
      </td>

      </tr>

      {timerPopupPos && bed && (
        <TimerEditPopup
          title={`${bed.id === 11 ? '견인치료기' : `${bed.id}번 배드`} 시간 설정`}
          initialSeconds={bed.remainingTime}
          position={timerPopupPos}
          onConfirm={handleTimerDurationConfirm}
          onCancel={() => setTimerPopupPos(null)}
        />
      )}
    </>
  );
});
