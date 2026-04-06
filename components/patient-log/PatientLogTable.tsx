
import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { PatientVisit, BedState, Preset } from '../../types';
import { PatientLogRow } from './PatientLogRow';
import { PatientLogTableHeader } from './PatientLogTableHeader';
import { getRowActiveStatus } from '../../utils/patientLogUtils';
import { useColumnResize } from '../../hooks/useColumnResize';
import { generateTreatmentString } from '../../utils/bedUtils';
import { normalizeUpperEnglishKeyInput } from '../../utils/keyboardLayout';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DEFAULT_STATUS_OPTIONS, normalizeStatusOptions, STATUS_OPTIONS_STORAGE_KEY, type StatusOptionConfig } from './StatusSelectionMenu';

type GridCellPos = { row: number; col: number };
type GridSelection = { start: GridCellPos; end: GridCellPos } | null;
type RowHeaderPos = { row: number };

const SELECTABLE_COLS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 10]);

const STATUS_TEXT_PAIRS = [
  ['is_injection', '주사'],
  ['is_fluid', '수액'],
  ['is_manual', '도수'],
  ['is_eswt', '충격파'],
  ['is_traction', '견인'],
  ['is_ion', '이온'],
  ['is_exercise', '운동'],
] as const satisfies ReadonlyArray<readonly [keyof PatientVisit, string]>;

const buildStatusText = (visit: PatientVisit, statusOptions: StatusOptionConfig[]) => [
  ...statusOptions
    .filter((option) => option.kind === 'predefined' && option.key && !!visit[option.key])
    .map((option) => option.label),
  ...(visit.custom_statuses || [])
    .sort((a, b) => a.order - b.order)
    .map((status) => {
      const matched = statusOptions.find((option) => option.id === status.id);
      return matched?.label || status.label;
    }),
].join(', ');

const parseStatusText = (raw: string, statusOptions: StatusOptionConfig[]): Partial<PatientVisit> => {
  const normalized = raw.trim();
  const baseFlags = Object.fromEntries(
    STATUS_TEXT_PAIRS.map(([key]) => [key, false])
  ) as Partial<PatientVisit> & { custom_statuses?: PatientVisit['custom_statuses'] };
  baseFlags.custom_statuses = [];

  if (!normalized) return baseFlags;

  const tokens = normalized
    .split(/[,\n/+\s]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const matchedKeys = new Set<keyof PatientVisit>();
  const matchedCustomStatuses: NonNullable<PatientVisit['custom_statuses']> = [];
  for (const token of tokens) {
    const matchedPredefined = statusOptions.find((option) => option.kind === 'predefined' && option.label === token);
    if (matchedPredefined?.key) {
      matchedKeys.add(matchedPredefined.key);
      continue;
    }

    const matchedCustom = statusOptions.find((option) => option.kind === 'custom' && option.label === token);
    if (matchedCustom) {
      matchedCustomStatuses.push({
        id: matchedCustom.id,
        label: matchedCustom.label,
        color: matchedCustom.color,
        order: matchedCustom.order,
      });
    }
  }

  STATUS_TEXT_PAIRS.forEach(([key]) => {
    baseFlags[key] = matchedKeys.has(key);
  });
  baseFlags.custom_statuses = matchedCustomStatuses;

  return baseFlags;
};

const normalizeSelectionBounds = (selection: GridSelection) => {
  if (!selection) return null;
  const rowMin = Math.min(selection.start.row, selection.end.row);
  const rowMax = Math.max(selection.start.row, selection.end.row);
  const colMin = Math.min(selection.start.col, selection.end.col);
  const colMax = Math.max(selection.start.col, selection.end.col);
  return { rowMin, rowMax, colMin, colMax };
};

const parseGridCellId = (el: HTMLElement | null): GridCellPos | null => {
  const gridHost = el?.closest?.('[data-grid-id]') as HTMLElement | null;
  const gridCell = el?.closest?.('[data-grid-cell-id]') as HTMLElement | null;
  const id = gridHost?.getAttribute('data-grid-id') || gridCell?.getAttribute('data-grid-cell-id');
  if (!id) return null;
  const [r, c] = id.split('-').map(Number);
  if (Number.isNaN(r) || Number.isNaN(c)) return null;
  return { row: r, col: c };
};

const parseRowHeaderId = (el: HTMLElement | null): RowHeaderPos | null => {
  const rowHeader = el?.closest?.('[data-row-header-id]') as HTMLElement | null;
  if (!rowHeader) return null;
  const raw = rowHeader.getAttribute('data-row-header-id');
  const row = raw ? Number(raw) : Number.NaN;
  if (Number.isNaN(row)) return null;
  return { row };
};

const findVisibleGridPos = (current: GridCellPos, direction: 'up' | 'down' | 'left' | 'right', totalRows: number): GridCellPos | null => {
  const deltaRow = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
  const deltaCol = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;

  let nextRow = current.row + deltaRow;
  let nextCol = current.col + deltaCol;

  while (nextRow >= 0 && nextRow < totalRows && nextCol >= 0 && nextCol <= 11) {
    const host = document.querySelector(`[data-grid-id="${nextRow}-${nextCol}"]`) as HTMLElement | null;
    if (host && host.getClientRects().length > 0) {
      return { row: nextRow, col: nextCol };
    }

    nextRow += deltaRow;
    nextCol += deltaCol;
  }

  return null;
};

const hasMeaningfulVisitContent = (visit: PatientVisit | undefined) => {
  if (!visit) return false;

  return Boolean(
    visit.bed_id !== null ||
    visit.chart_number?.trim() ||
    visit.patient_name?.trim() ||
    visit.gender?.trim() ||
    visit.body_part?.trim() ||
    visit.treatment_name?.trim() ||
    visit.memo?.trim() ||
    visit.special_note?.trim() ||
    visit.author?.trim() ||
    visit.is_injection ||
    visit.is_fluid ||
    visit.is_manual ||
    visit.is_eswt ||
    visit.is_traction ||
    visit.is_ion ||
    visit.is_exercise ||
    visit.custom_statuses?.length
  );
};

interface PatientLogTableProps {
  visits: PatientVisit[];
  currentDate: string;
  beds: BedState[];
  presets: Preset[];
  getRowStatus: (visitId: string, bedId: number | null) => 'active' | 'completed' | 'none';
  onUpdate: (id: string, updates: Partial<PatientVisit>, skipBedSync?: boolean) => void;
  onDelete: (id: string) => void;
  onCreate: (updates: Partial<PatientVisit>) => Promise<string>;
  onSelectLog: (id: string, bedId?: number | null, options?: { append?: boolean }) => void;
  onMovePatient: (visitId: string, currentBedId: number, newBedId: number) => void;
  onEditActive?: (bedId: number) => void;
  onNextStep?: (bedId: number) => void;
  onPrevStep?: (bedId: number) => void;
  onClearBed?: (bedId: number) => void;
  isBedActivationDisabled?: boolean;
  onSelectionAnchorChange?: (rowIndex: number | null, colIndex: number | null) => void;
  cancelAutoFocusRef?: React.MutableRefObject<(() => void) | null>;
  patientNameSuggestions?: string[];
  patientNameAutofillMap?: Record<string, { chart_number?: string; gender?: string }>;
  memoSuggestions?: string[];
  specialNoteSuggestions?: string[];
  onMoveRowsToBottomLocal?: (rows: number[]) => void;
  onBulkUpdate?: (patches: Array<{ id: string; updates: Partial<PatientVisit>; skipBedSync?: boolean; clearBedId?: number | null }>) => void;
  suppressedChartAutofillVisitIds?: string[];
  onChartAutofillSuppressionChange?: (visitId: string, suppressed: boolean) => void;
}

export const PatientLogTable: React.FC<PatientLogTableProps> = memo(({
  visits,
  currentDate,
  beds,
  presets,
  getRowStatus,
  onUpdate,
  onDelete,
  onCreate,
  onSelectLog,
  onMovePatient,
  onEditActive,
  onNextStep,
  onPrevStep,
  onClearBed,
  isBedActivationDisabled = false,
  onSelectionAnchorChange,
  cancelAutoFocusRef,
  patientNameSuggestions = [],
  patientNameAutofillMap = {},
  memoSuggestions = [],
  specialNoteSuggestions = [],
  onMoveRowsToBottomLocal,
  onBulkUpdate,
  suppressedChartAutofillVisitIds = [],
  onChartAutofillSuppressionChange,
}) => {
  const getLocalISODate = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
  };
  const isTodayView = currentDate === getLocalISODate();
  const [statusOptions] = useLocalStorage<StatusOptionConfig[]>(STATUS_OPTIONS_STORAGE_KEY, DEFAULT_STATUS_OPTIONS);
  const normalizedStatusOptions = normalizeStatusOptions(statusOptions);
  const [totalRows, setTotalRows] = useState(120);
  const [selection, setSelection] = useState<GridSelection>(null);
  const [clipboardSelection, setClipboardSelection] = useState<{ selection: GridSelection; mode: 'copy' | 'cut' } | null>(null);
  const [rowHeaderMenu, setRowHeaderMenu] = useState<{ row: number; rows: number[]; x: number; y: number } | null>(null);
  const showTimerColumn = false;
  const activeBedIds = beds.filter(b => b.status !== 'IDLE').map(b => b.id);
  const isDraggingRef = useRef(false);
  const skipRowHeaderClickRef = useRef(false);
  const skipPointerSelectionCommitRef = useRef(false);
  const skipFocusSelectionCommitRef = useRef(false);
  const focusSkipResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Column resize (desktop & tablet portrait)
  const tableRef = useRef<HTMLTableElement>(null);
  const { columnWidths, isResizing, activeResizeColIndex, onResizeStart } = useColumnResize(tableRef);

  // Auto-focus logic for new row creation
  // Stores { rowOffset, colIndex }
  // rowOffset = 1 (vertical: jump to new draft), rowOffset = 0 (horizontal: stay on created row)
  const focusTargetRef = useRef<{ rowOffset: number, colIndex: number } | null>(null);
  const absoluteFocusTargetRef = useRef<{ row: number, colIndex: number } | null>(null);
  const pendingAutoFocusVisitsLengthRef = useRef<number | null>(null);
  const prevVisitsLengthRef = useRef(visits.length);
  const pendingAutoFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerDownAtRef = useRef(0);

  const buildWholeRowSelection = useCallback((row: number): GridSelection => ({
    start: { row, col: 0 },
    end: { row, col: 10 },
  }), []);

  const isWholeRowSelected = useCallback((row: number) => {
    const bounds = normalizeSelectionBounds(selection);
    if (!bounds) return false;
    return bounds.rowMin === row && bounds.rowMax === row && bounds.colMin === 0 && bounds.colMax === 10;
  }, [selection]);

  const getSelectedWholeRows = useCallback(() => {
    const bounds = normalizeSelectionBounds(selection);
    if (!bounds) return [] as number[];
    if (bounds.colMin !== 0 || bounds.colMax !== 10) return [] as number[];
    return Array.from({ length: bounds.rowMax - bounds.rowMin + 1 }, (_, idx) => bounds.rowMin + idx);
  }, [selection]);

  const getInsertCreatedAt = useCallback((insertIndex: number) => {
    const prevVisit = visits[insertIndex - 1];
    const nextVisit = visits[insertIndex];
    const prevTime = prevVisit?.created_at ? new Date(prevVisit.created_at).getTime() : null;
    const nextTime = nextVisit?.created_at ? new Date(nextVisit.created_at).getTime() : null;

    if (prevTime !== null && nextTime !== null) {
      const gap = nextTime - prevTime;
      if (gap > 1) {
        return new Date(prevTime + Math.floor(gap / 2)).toISOString();
      }
      return new Date(prevTime + 1).toISOString();
    }

    if (prevTime !== null) {
      return new Date(prevTime + 1000).toISOString();
    }

    if (nextTime !== null) {
      return new Date(nextTime - 1000).toISOString();
    }

    return new Date().toISOString();
  }, [visits]);

  const closeRowHeaderMenu = useCallback(() => {
    setRowHeaderMenu(null);
  }, []);

  const handleInsertRow = useCallback(async (row: number, direction: 'above' | 'below') => {
    const insertIndex = Math.max(0, Math.min(direction === 'above' ? row : row + 1, visits.length));
    await onCreate({ created_at: getInsertCreatedAt(insertIndex) });
    setSelection(buildWholeRowSelection(insertIndex));
    onSelectionAnchorChange?.(insertIndex, 0);
    closeRowHeaderMenu();
  }, [visits.length, onCreate, getInsertCreatedAt, buildWholeRowSelection, onSelectionAnchorChange, closeRowHeaderMenu]);

  const handleDeleteRow = useCallback((row: number) => {
    const visit = visits[row];
    if (visit) {
      onDelete(visit.id);
    } else {
      setTotalRows((prev) => Math.max(visits.length, prev - 1));
    }
    setSelection(null);
    onSelectionAnchorChange?.(null, null);
    closeRowHeaderMenu();
  }, [visits, onDelete, onSelectionAnchorChange, closeRowHeaderMenu]);

  const handleDeleteRows = useCallback((rows: number[]) => {
    const uniqueRows = Array.from(new Set(rows)).sort((a, b) => b - a);
    let draftRowsToRemove = 0;

    uniqueRows.forEach((row) => {
      const visit = visits[row];
      if (visit) {
        onDelete(visit.id);
      } else {
        draftRowsToRemove += 1;
      }
    });

    if (draftRowsToRemove > 0) {
      setTotalRows((prev) => Math.max(visits.length, prev - draftRowsToRemove));
    }

    setSelection(null);
    onSelectionAnchorChange?.(null, null);
    closeRowHeaderMenu();
  }, [visits, onDelete, onSelectionAnchorChange, closeRowHeaderMenu]);

  const handleMoveRowsToBottom = useCallback((rows: number[]) => {
    const uniqueRows = Array.from(new Set(rows))
      .filter((row) => row >= 0 && row < visits.length)
      .sort((a, b) => a - b);
    if (uniqueRows.length === 0) return;

    const selectedRowSet = new Set(uniqueRows);
    const remainingVisits = visits.filter((_, index) => !selectedRowSet.has(index));
    const lastMeaningfulIndex = (() => {
      for (let index = remainingVisits.length - 1; index >= 0; index -= 1) {
        if (hasMeaningfulVisitContent(remainingVisits[index])) return index;
      }
      return -1;
    })();
    const insertIndex = Math.max(0, lastMeaningfulIndex + 1);
    const prevVisit = remainingVisits[insertIndex - 1];
    const nextVisit = remainingVisits[insertIndex];
    const prevTime = prevVisit?.created_at ? new Date(prevVisit.created_at).getTime() : null;
    const nextTime = nextVisit?.created_at ? new Date(nextVisit.created_at).getTime() : null;

    let timestamps: number[];
    if (prevTime !== null && nextTime !== null && nextTime - prevTime > uniqueRows.length) {
      timestamps = uniqueRows.map((_, index) => prevTime + index + 1);
    } else if (prevTime !== null && nextTime !== null) {
      timestamps = uniqueRows.map((_, index) => nextTime - uniqueRows.length + index);
    } else if (prevTime !== null) {
      timestamps = uniqueRows.map((_, index) => prevTime + index + 1);
    } else if (nextTime !== null) {
      timestamps = uniqueRows.map((_, index) => nextTime - uniqueRows.length + index);
    } else {
      const baseTime = Date.now();
      timestamps = uniqueRows.map((_, index) => baseTime + index);
    }

    const bottomRow = Math.max(0, insertIndex);
    onMoveRowsToBottomLocal?.(uniqueRows);
    setSelection({
      start: { row: bottomRow, col: 0 },
      end: { row: bottomRow + uniqueRows.length - 1, col: 10 },
    });
    onSelectionAnchorChange?.(bottomRow, 0);
    requestAnimationFrame(() => {
      const host = document.querySelector(`[data-grid-id="${bottomRow}-0"]`) as HTMLElement | null;
      host?.focus();
    });

    uniqueRows.forEach((row, index) => {
      const visit = visits[row];
      if (!visit) return;
      void Promise.resolve(onUpdate(visit.id, { created_at: new Date(timestamps[index]).toISOString() }, true));
    });
  }, [visits, onUpdate, onSelectionAnchorChange, onMoveRowsToBottomLocal]);


  // Expose cancel function to parent so search shortcuts can prevent auto-focus stealing
  useEffect(() => {
    if (cancelAutoFocusRef) {
      cancelAutoFocusRef.current = () => {
        focusTargetRef.current = null;
        absoluteFocusTargetRef.current = null;
        if (pendingAutoFocusTimerRef.current) {
          clearTimeout(pendingAutoFocusTimerRef.current);
          pendingAutoFocusTimerRef.current = null;
        }
      };
    }
  });

  useEffect(() => {
    // If visits length increased, it means a row was added.
    if (visits.length > prevVisitsLengthRef.current && (focusTargetRef.current !== null || absoluteFocusTargetRef.current !== null)) {
      if (pendingAutoFocusVisitsLengthRef.current !== null && visits.length < pendingAutoFocusVisitsLengthRef.current) {
        prevVisitsLengthRef.current = visits.length;
        return;
      }

      const fallbackBaseRowIndex = prevVisitsLengthRef.current;
      const targetRowIndex = absoluteFocusTargetRef.current
        ? absoluteFocusTargetRef.current.row
        : fallbackBaseRowIndex + (focusTargetRef.current?.rowOffset || 0);
      const targetColIndex = absoluteFocusTargetRef.current
        ? absoluteFocusTargetRef.current.colIndex
        : (focusTargetRef.current?.colIndex ?? 0);

      // Small delay to allow DOM to update
      if (pendingAutoFocusTimerRef.current) {
        clearTimeout(pendingAutoFocusTimerRef.current);
      }

      pendingAutoFocusTimerRef.current = setTimeout(() => {
        // If the user manually clicked very recently, never steal focus to another cell.
        if (Date.now() - lastPointerDownAtRef.current < 250) {
          focusTargetRef.current = null;
          absoluteFocusTargetRef.current = null;
          pendingAutoFocusVisitsLengthRef.current = null;
          return;
        }

        // If a modal overlay is open (search / memo history) or a modal transition is in progress, never steal focus.
        if (document.querySelector('[data-modal-overlay="true"]') || document.body.getAttribute('data-prevent-autofocus') === 'true') {
          focusTargetRef.current = null;
          absoluteFocusTargetRef.current = null;
          pendingAutoFocusVisitsLengthRef.current = null;
          return;
        }

        const targetEl = document.querySelector(`[data-grid-id="${targetRowIndex}-${targetColIndex}"]`) as HTMLElement;
        if (targetEl) {
          const activeEl = document.activeElement as HTMLElement | null;
          const activeGridId = activeEl?.getAttribute?.('data-grid-id');
          const targetGridId = `${targetRowIndex}-${targetColIndex}`;

          // If user focus is already on another grid cell, keep current user intent.
          if (!activeGridId || activeGridId === targetGridId) {
            targetEl.focus();
          }
        }
        focusTargetRef.current = null;
        absoluteFocusTargetRef.current = null;
        pendingAutoFocusVisitsLengthRef.current = null;
      }, 0);
    }
    prevVisitsLengthRef.current = visits.length;
  }, [visits.length]);



  useEffect(() => {
    return () => {
      if (pendingAutoFocusTimerRef.current) {
        clearTimeout(pendingAutoFocusTimerRef.current);
      }
      if (focusSkipResetTimerRef.current) {
        clearTimeout(focusSkipResetTimerRef.current);
      }
    };
  }, []);

  const focusHostWithoutResettingSelection = useCallback((pos: GridCellPos) => {
    skipFocusSelectionCommitRef.current = true;
    if (focusSkipResetTimerRef.current) {
      clearTimeout(focusSkipResetTimerRef.current);
    }

    const host = document.querySelector(`[data-grid-id="${pos.row}-${pos.col}"]`) as HTMLElement | null;
    host?.focus();

    focusSkipResetTimerRef.current = setTimeout(() => {
      skipFocusSelectionCommitRef.current = false;
      focusSkipResetTimerRef.current = null;
    }, 0);
  }, []);

  const handleDraftCreate = async (draftRowIndex: number, updates: Partial<PatientVisit>, colIndex?: number, navDirection?: 'down' | 'right' | 'left' | 'up') => {
    const insertRowIndex = Math.min(draftRowIndex, visits.length);
    if (colIndex !== undefined) {
      const targetBaseRow = draftRowIndex;
      if (navDirection === 'left') {
        absoluteFocusTargetRef.current = { row: targetBaseRow, colIndex: colIndex - 1 };
      } else if (navDirection === 'right') {
        absoluteFocusTargetRef.current = { row: targetBaseRow, colIndex: colIndex + 1 };
      } else if (navDirection === 'up') {
        absoluteFocusTargetRef.current = { row: Math.max(0, targetBaseRow - 1), colIndex };
      } else if (navDirection === 'down') {
        absoluteFocusTargetRef.current = { row: targetBaseRow + 1, colIndex };
      } else if (colIndex === 5 && typeof updates.treatment_name === 'string' && updates.treatment_name.trim() !== '') {
        absoluteFocusTargetRef.current = { row: targetBaseRow, colIndex };
      } else {
        absoluteFocusTargetRef.current = { row: targetBaseRow, colIndex };
      }
    }

    // 화면상 아래쪽 빈 슬롯에서 직접 입력한 경우에도,
    // 그 슬롯 자체가 실제 행이 되도록 중간 빈 행을 먼저 채운다.
    if (draftRowIndex > visits.length) {
      pendingAutoFocusVisitsLengthRef.current = draftRowIndex + 1;
      const tailCreatedAt = visits.length > 0
        ? new Date(visits[visits.length - 1].created_at || 0).getTime()
        : Date.now();

      for (let fillerOffset = 0; fillerOffset < draftRowIndex - visits.length; fillerOffset += 1) {
        await onCreate({
          created_at: new Date(tailCreatedAt + (fillerOffset + 1) * 1000).toISOString(),
        });
      }

      return await onCreate({
        ...updates,
        ...(updates.created_at ? {} : {
          created_at: new Date(tailCreatedAt + (draftRowIndex - visits.length + 1) * 1000).toISOString(),
        }),
      });
    }

    pendingAutoFocusVisitsLengthRef.current = insertRowIndex + 1;
    return await onCreate({
      ...updates,
      ...(updates.created_at ? {} : { created_at: getInsertCreatedAt(insertRowIndex) }),
    });
  };

  const handleBulkAuthorUpdate = useCallback((val: string) => {
    visits.forEach(v => {
      if (!v.author || v.author.trim() === '') {
        onUpdate(v.id, { author: val }, true);
      }
    });
  }, [visits, onUpdate]);

  const getVisitCellText = useCallback((visit: PatientVisit, col: number) => {
    switch (col) {
      case 0: return visit.bed_id ? String(visit.bed_id) : '';
      case 1: return visit.chart_number || '';
      case 2: return visit.patient_name || '';
      case 3: return visit.gender || '';
      case 4: return visit.body_part || '';
      case 5: return visit.treatment_name || '';
      case 6: return buildStatusText(visit, normalizedStatusOptions);
      case 7: return visit.memo || '';
      case 8: return visit.special_note || '';
      case 10: return visit.author || '';
      default: return '';
    }
  }, [normalizedStatusOptions]);


  const normalizeTreatmentPasteText = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return '';

    // 세트 배지 텍스트가 함께 복사된 경우(예: "세트명 HP / ICT")
    // 실제 처방 목록 부분만 추출한다.
    for (const preset of presets) {
      const presetName = (preset.name || '').trim();
      if (!presetName) continue;
      if (!trimmed.startsWith(presetName)) continue;

      const rest = trimmed.slice(presetName.length).trim();
      if (rest.includes('/') || rest.includes('+')) {
        return rest;
      }
    }

    return trimmed;
  }, [presets]);

  const buildVisitCellPatch = useCallback((visit: PatientVisit, col: number, text: string) => {
    switch (col) {
      case 0: {
        const trimmed = text.trim();
        if (!trimmed) {
          return { id: visit.id, updates: { bed_id: null }, skipBedSync: isBedActivationDisabled, clearBedId: null };
        }
        const parsed = Number(trimmed);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 11) return null;
        return { id: visit.id, updates: { bed_id: parsed }, skipBedSync: isBedActivationDisabled, clearBedId: null };
      }
      case 1:
        return { id: visit.id, updates: { chart_number: text }, skipBedSync: true, clearBedId: null };
      case 2:
        return { id: visit.id, updates: { patient_name: text }, skipBedSync: true, clearBedId: null };
      case 3:
        return { id: visit.id, updates: { gender: text.toUpperCase().slice(0, 1) }, skipBedSync: true, clearBedId: null };
      case 4:
        return { id: visit.id, updates: { body_part: text }, skipBedSync: true, clearBedId: null };
      case 5: {
        const normalizedTreatment = normalizeTreatmentPasteText(text);
        const isActiveRow = getRowStatus(visit.id, visit.bed_id) === 'active';
        const shouldSkipBedSync = isBedActivationDisabled || !isActiveRow || !visit.bed_id;
        return {
          id: visit.id,
          updates: { treatment_name: normalizedTreatment },
          skipBedSync: shouldSkipBedSync,
          clearBedId: !isBedActivationDisabled && normalizedTreatment === '' && isActiveRow && visit.bed_id ? visit.bed_id : null,
        };
      }
      case 7:
        return { id: visit.id, updates: { memo: text }, skipBedSync: true, clearBedId: null };
      case 6: {
        const nextFlags = parseStatusText(text, normalizedStatusOptions);
        const shouldSkipBedSync = isBedActivationDisabled || getRowStatus(visit.id, visit.bed_id) !== 'active';
        return { id: visit.id, updates: nextFlags, skipBedSync: shouldSkipBedSync, clearBedId: null };
      }
      case 8:
        return { id: visit.id, updates: { special_note: text }, skipBedSync: true, clearBedId: null };
      case 10:
        return { id: visit.id, updates: { author: normalizeUpperEnglishKeyInput(text).slice(0, 4) }, skipBedSync: true, clearBedId: null };
      default:
        return null;
    }
  }, [getRowStatus, normalizeTreatmentPasteText, isBedActivationDisabled, normalizedStatusOptions]);

  const setVisitCellText = useCallback((visit: PatientVisit, col: number, text: string) => {
    const patch = buildVisitCellPatch(visit, col, text);
    if (!patch) return;

    if (typeof patch.updates.treatment_name === 'string' && patch.updates.treatment_name === '') {
      window.dispatchEvent(new CustomEvent('patient-log-clear-treatment-display', {
        detail: { visitId: visit.id },
      }));
    }

    onUpdate(patch.id, patch.updates, patch.skipBedSync);
    if (patch.clearBedId) {
      onClearBed?.(patch.clearBedId);
    }
  }, [buildVisitCellPatch, onUpdate, onClearBed]);

  const handleGridClipboardCopy = useCallback((shouldCut: boolean) => {
    const bounds = normalizeSelectionBounds(selection);
    if (!bounds) return '';

    const rows: string[] = [];
    const cutPatches: Array<{ id: string; updates: Partial<PatientVisit>; skipBedSync?: boolean; clearBedId?: number | null }> = [];
    for (let row = bounds.rowMin; row <= bounds.rowMax; row++) {
      const visit = visits[row];
      const cols: string[] = [];
      for (let col = bounds.colMin; col <= bounds.colMax; col++) {
        if (!SELECTABLE_COLS.has(col) || !visit) {
          cols.push('');
          continue;
        }

        const val = getVisitCellText(visit, col);
        cols.push(val);

        if (shouldCut) {
          const patch = buildVisitCellPatch(visit, col, '');
          if (patch) cutPatches.push(patch);
        }
      }
      rows.push(cols.join('\t'));
    }

    if (shouldCut && cutPatches.length > 0) {
      if (onBulkUpdate) {
        onBulkUpdate(cutPatches);
      } else {
        cutPatches.forEach((patch) => {
          if (typeof patch.updates.treatment_name === 'string' && patch.updates.treatment_name === '') {
            window.dispatchEvent(new CustomEvent('patient-log-clear-treatment-display', {
              detail: { visitId: patch.id },
            }));
          }
          onUpdate(patch.id, patch.updates, patch.skipBedSync);
          if (patch.clearBedId) onClearBed?.(patch.clearBedId);
        });
      }
    }

    return rows.join('\n');
  }, [selection, visits, getVisitCellText, buildVisitCellPatch, onBulkUpdate, onUpdate, onClearBed]);

  const buildDraftUpdatesForPasteRow = useCallback((line: string[], anchorCol: number) => {
    const updates: Partial<PatientVisit> = {};

    line.forEach((cellText, cIdx) => {
      const col = anchorCol + cIdx;
      if (!SELECTABLE_COLS.has(col)) return;

      const normalized = cellText.trim();
      if (!normalized) return;

      switch (col) {
        case 0: {
          if (!isBedActivationDisabled) break;
          const parsed = Number(normalized);
          if (!Number.isInteger(parsed) || parsed < 1 || parsed > 11) break;
          updates.bed_id = parsed;
          break;
        }
        case 1:
          updates.chart_number = normalized;
          break;
        case 2:
          updates.patient_name = normalized;
          break;
        case 3:
          updates.gender = normalized.toUpperCase().slice(0, 1);
          break;
        case 4:
          updates.body_part = normalized;
          break;
        case 5:
          updates.treatment_name = normalized;
          break;
        case 6:
          Object.assign(updates, parseStatusText(normalized, normalizedStatusOptions));
          break;
        case 7:
          updates.memo = normalized;
          break;
        case 8:
          updates.special_note = normalized;
          break;
        case 10:
          updates.author = normalizeUpperEnglishKeyInput(normalized).slice(0, 4);
          break;
        default:
          break;
      }
    });

    return updates;
  }, [isBedActivationDisabled, normalizedStatusOptions]);

  const handleGridPaste = useCallback(async (raw: string) => {
    if (!raw) return;
    const bounds = normalizeSelectionBounds(selection);
    const anchor = bounds ? { row: bounds.rowMin, col: bounds.colMin } : null;
    if (!anchor) return;

    const parsedRows = raw.replace(/\r/g, '').split('\n').filter((line) => line.length > 0).map((line) => line.split('\t'));
    if (parsedRows.length === 0) return;

    const pendingPatches: Array<{ id: string; updates: Partial<PatientVisit>; skipBedSync?: boolean; clearBedId?: number | null }> = [];

    for (const [rIdx, line] of parsedRows.entries()) {
      const row = anchor.row + rIdx;
      const visit = visits[row];

      if (!visit) {
        // Draft 행(휴지통 미표시)에도 붙여넣기 시 즉시 행을 생성해 값을 반영한다.
        const draftUpdates = buildDraftUpdatesForPasteRow(line, anchor.col);
        if (Object.keys(draftUpdates).length > 0) {
          await onCreate(draftUpdates);
        }
        continue;
      }

      line.forEach((cellText, cIdx) => {
        const col = anchor.col + cIdx;
        if (!SELECTABLE_COLS.has(col)) return;
        const patch = buildVisitCellPatch(visit, col, cellText);
        if (patch) pendingPatches.push(patch);
      });
    }

    if (pendingPatches.length > 0) {
      if (onBulkUpdate) {
        onBulkUpdate(pendingPatches);
      } else {
        pendingPatches.forEach((patch) => {
          if (typeof patch.updates.treatment_name === 'string' && patch.updates.treatment_name === '') {
            window.dispatchEvent(new CustomEvent('patient-log-clear-treatment-display', {
              detail: { visitId: patch.id },
            }));
          }
          onUpdate(patch.id, patch.updates, patch.skipBedSync);
          if (patch.clearBedId) onClearBed?.(patch.clearBedId);
        });
      }
    }
  }, [selection, visits, buildVisitCellPatch, buildDraftUpdatesForPasteRow, onCreate, onBulkUpdate, onUpdate, onClearBed]);


  const isActiveInputEditing = (el: HTMLElement | null) => {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'SELECT') return true;
    if (el.getAttribute('contenteditable') === 'true') return true;
    if (el.tagName === 'INPUT') {
      const input = el as HTMLInputElement;
      if (input.dataset.searchModalInput === 'true') return true;
      return input.dataset.directEditing === 'true';
    }
    return false;
  };

  const isInlineTreatmentSelectionInput = (input: HTMLElement | null) => {
    if (!input || input.tagName !== 'INPUT') return false;
    return input.dataset.inlineTreatmentEditing === 'true' && input.dataset.directEditing !== 'true';
  };

  const clearSelectionContents = useCallback(() => {
    const bounds = normalizeSelectionBounds(selection);
    if (!bounds) return false;

    const selectedCols: number[] = [];
    for (let col = bounds.colMin; col <= bounds.colMax; col++) {
      if (SELECTABLE_COLS.has(col)) selectedCols.push(col);
    }

    selectedCols.sort((a, b) => {
      if (a === 5 && b === 0) return -1;
      if (a === 0 && b === 5) return 1;
      return a - b;
    });

    const clearPatches: Array<{ id: string; updates: Partial<PatientVisit>; skipBedSync?: boolean; clearBedId?: number | null }> = [];
    for (let row = bounds.rowMin; row <= bounds.rowMax; row++) {
      const visit = visits[row];
      if (!visit) continue;

      for (const col of selectedCols) {
        const patch = buildVisitCellPatch(visit, col, '');
        if (!patch) continue;
        if (onBulkUpdate) {
          clearPatches.push(patch);
        } else {
          setVisitCellText(visit, col, '');
        }
      }
    }

    if (onBulkUpdate && clearPatches.length > 0) {
      onBulkUpdate(clearPatches);
    }

    return true;
  }, [selection, visits, buildVisitCellPatch, onBulkUpdate, setVisitCellText]);
  const handleCopy = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const active = document.activeElement as HTMLElement | null;
    if (isActiveInputEditing(active)) return;

    const text = handleGridClipboardCopy(false);
    if (!text) return;

    e.preventDefault();
    e.clipboardData.setData('text/plain', text);
    try { await navigator.clipboard?.writeText(text); } catch { /* noop */ }
    if (selection) {
      setClipboardSelection({ selection, mode: 'copy' });
    }
  }, [handleGridClipboardCopy, selection]);

  const handleCut = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const active = document.activeElement as HTMLElement | null;
    if (isActiveInputEditing(active)) return;

    const text = handleGridClipboardCopy(true);
    if (!text) return;

    e.preventDefault();
    e.clipboardData.setData('text/plain', text);
    try { await navigator.clipboard?.writeText(text); } catch { /* noop */ }
    if (selection) {
      setClipboardSelection({ selection, mode: 'cut' });
    }
  }, [handleGridClipboardCopy, selection]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const active = document.activeElement as HTMLElement | null;
    if (isActiveInputEditing(active)) return;

    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    setClipboardSelection(null);
    void handleGridPaste(text);
  }, [handleGridPaste]);

  const handleInlineSelectionKeyDownCapture = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || active.tagName !== 'INPUT') return;
    if (active.dataset.inlineTreatmentEditing !== 'true' || active.dataset.directEditing === 'true') return;
    if (!e.shiftKey) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

    const bounds = normalizeSelectionBounds(selection);
    const anchor = bounds ? { row: bounds.rowMin, col: bounds.colMin } : null;
    const current = selection?.end ?? anchor ?? parseGridCellId(active);
    if (!current) return;

    const direction =
      e.key === 'ArrowUp' ? 'up' :
      e.key === 'ArrowDown' ? 'down' :
      e.key === 'ArrowLeft' ? 'left' : 'right';
    const nextPos = findVisibleGridPos(current, direction, totalRows);
    if (!nextPos) return;

    e.preventDefault();
    e.stopPropagation();
    if (selection) {
      setSelection({ start: selection.start, end: nextPos });
    } else {
      setSelection({ start: current, end: nextPos });
    }
    onSelectionAnchorChange?.(nextPos.row, nextPos.col);
    focusHostWithoutResettingSelection(nextPos);
  }, [selection, totalRows, onSelectionAnchorChange, focusHostWithoutResettingSelection]);



  const handleSelectionKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const active = document.activeElement as HTMLInputElement | null;
    if (isActiveInputEditing(active)) return;

    const isShortcut = e.ctrlKey || e.metaKey;
    const keyLower = e.key.toLowerCase();

    if (isShortcut && (keyLower === 'c' || keyLower === 'x')) {
      const text = handleGridClipboardCopy(keyLower === 'x');
      if (!text) return;
      e.preventDefault();
      void navigator.clipboard?.writeText(text).catch(() => {});
      if (selection) {
        setClipboardSelection({ selection, mode: keyLower === 'x' ? 'cut' : 'copy' });
      }
      return;
    }

    if (isShortcut && keyLower === 'v') {
      e.preventDefault();
      setClipboardSelection(null);
      void (async () => {
        try {
          const text = await navigator.clipboard?.readText();
          if (text) void handleGridPaste(text);
        } catch {
          // noop
        }
      })();
      return;
    }

    const selectedWholeRows = getSelectedWholeRows();
    if (isShortcut && e.key === 'ArrowDown' && selectedWholeRows.length > 0) {
      e.preventDefault();
      void handleMoveRowsToBottom(selectedWholeRows);
      return;
    }

    const bounds = normalizeSelectionBounds(selection);
    const anchor = bounds ? { row: bounds.rowMin, col: bounds.colMin } : null;
    const isStatusMenuOpen = document.body.dataset.patientStatusMenuOpen === 'true';

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (isStatusMenuOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const current = e.shiftKey
        ? (selection?.end ?? anchor ?? parseGridCellId(document.activeElement as HTMLElement | null))
        : (anchor ?? parseGridCellId(document.activeElement as HTMLElement | null));
      if (!current) return;

      const direction =
        e.key === 'ArrowUp' ? 'up' :
        e.key === 'ArrowDown' ? 'down' :
        e.key === 'ArrowLeft' ? 'left' : 'right';
      const nextPos = findVisibleGridPos(current, direction, totalRows);
      if (!nextPos) return;

      e.preventDefault();
      if (e.shiftKey && selection) {
        setSelection({ start: selection.start, end: nextPos });
      } else {
        setSelection({ start: nextPos, end: nextPos });
      }
      onSelectionAnchorChange?.(nextPos.row, nextPos.col);
      focusHostWithoutResettingSelection(nextPos);
      return;
    }

    const isPlainTypingKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (isPlainTypingKey && anchor) {
      if (isInlineTreatmentSelectionInput(active)) {
        return;
      }

      const host = document.querySelector(`[data-grid-id="${anchor.row}-${anchor.col}"]`) as HTMLElement | null;
      const inputTarget = host?.tagName === 'INPUT'
        ? host as HTMLInputElement
        : (host?.querySelector('input') as HTMLInputElement | null);

      if (inputTarget) {
        inputTarget.focus();

        // IME(한글) 조합 중에는 키 이벤트 재주입 시 자모 분리(ㅈㅜ)가 발생할 수 있어 차단.
        const nativeEvt = e.nativeEvent as KeyboardEvent & { keyCode?: number; which?: number };
        const isIMEKey = nativeEvt.isComposing || e.key === 'Process' || nativeEvt.keyCode === 229 || nativeEvt.which === 229;
        if (isIMEKey) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        const replay = new KeyboardEvent('keydown', { key: e.key, bubbles: true, cancelable: true });
        inputTarget.dispatchEvent(replay);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    if (e.key === 'Escape') {
      if (!selection) return;
      e.preventDefault();
      setSelection(null);
      onSelectionAnchorChange?.(null, null);
      return;
    }

    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    if (document.body.dataset.statusPillSelected === 'true') return;
    if ((document.activeElement as HTMLElement | null)?.dataset.statusPillSelected === 'true') return;
    if (!bounds) return;

    e.preventDefault();
    clearSelectionContents();
  }, [selection, totalRows, onSelectionAnchorChange, handleGridClipboardCopy, handleGridPaste, clearSelectionContents, getSelectedWholeRows, handleMoveRowsToBottom]);

  useEffect(() => {
    const handleWindowDelete = (event: KeyboardEvent) => {
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;

      const active = document.activeElement as HTMLElement | null;
      if (isActiveInputEditing(active)) return;
      if (document.body.dataset.statusPillSelected === 'true') return;
      if ((active as HTMLElement | null)?.dataset.statusPillSelected === 'true') return;

      const bounds = normalizeSelectionBounds(selection);
      if (!bounds) return;

      event.preventDefault();
      clearSelectionContents();
    };

    window.addEventListener('keydown', handleWindowDelete, true);
    return () => window.removeEventListener('keydown', handleWindowDelete, true);
  }, [selection, clearSelectionContents]);

  useEffect(() => {
    const bounds = normalizeSelectionBounds(selection);
    const selected = new Set<string>();
    if (bounds) {
      for (let row = bounds.rowMin; row <= bounds.rowMax; row++) {
        for (let col = bounds.colMin; col <= bounds.colMax; col++) {
          selected.add(`${row}-${col}`);
        }
      }
    }

    const clipboardBounds = normalizeSelectionBounds(clipboardSelection?.selection ?? null);
    const copied = new Set<string>();
    if (clipboardBounds) {
      for (let row = clipboardBounds.rowMin; row <= clipboardBounds.rowMax; row++) {
        for (let col = clipboardBounds.colMin; col <= clipboardBounds.colMax; col++) {
          copied.add(`${row}-${col}`);
        }
      }
    }

    const previouslyHighlightedHosts = Array.from(document.querySelectorAll('[data-grid-id][data-grid-selection="true"], [data-grid-id][data-grid-clipboard="true"]')) as HTMLElement[];
    previouslyHighlightedHosts.forEach((host) => {
      host.removeAttribute('data-grid-selection');
      host.removeAttribute('data-grid-clipboard');
      host.style.boxShadow = '';
      host.style.outline = '';
      host.style.outlineOffset = '';
      host.style.backgroundColor = '';
      host.style.borderRadius = '';
    });

    const previouslyHighlightedCells = Array.from(document.querySelectorAll('td[data-grid-selection="true"], td[data-grid-clipboard="true"]')) as HTMLElement[];
    previouslyHighlightedCells.forEach((cell) => {
      cell.removeAttribute('data-grid-selection');
      cell.removeAttribute('data-grid-clipboard');
      cell.style.boxShadow = '';
      cell.style.outline = '';
      cell.style.outlineOffset = '';
      cell.style.backgroundColor = '';
      cell.style.borderRadius = '';
    });

    selected.forEach((id) => {
      const host = document.querySelector(`[data-grid-id="${id}"]`) as HTMLElement | null;
      if (!host) return;
      const cell = host.closest('td') as HTMLElement | null;
      if (!cell) return;

      host.setAttribute('data-grid-selection', 'true');
      host.style.outline = 'none';
      host.style.outlineOffset = '0';
      host.style.boxShadow = 'none';

      cell.setAttribute('data-grid-selection', 'true');
      cell.style.boxShadow = 'inset 0 0 0 2px rgb(14 165 233)';
      cell.style.backgroundColor = 'rgba(14, 165, 233, 0.08)';
      cell.style.borderRadius = '0';
    });

    copied.forEach((id) => {
      const host = document.querySelector(`[data-grid-id="${id}"]`) as HTMLElement | null;
      if (!host) return;
      const cell = host.closest('td') as HTMLElement | null;
      if (!cell) return;

      host.setAttribute('data-grid-clipboard', 'true');
      cell.setAttribute('data-grid-clipboard', 'true');

      if (!selected.has(id)) {
        cell.style.backgroundColor = 'rgba(14, 165, 233, 0.06)';
      }
      cell.style.outline = '1.5px dashed rgb(14 165 233 / 0.95)';
      cell.style.outlineOffset = '-2px';
    });
  }, [selection, clipboardSelection, visits.length, totalRows]);

  useEffect(() => {
    const handleForceSelection = (event: Event) => {
      const customEvent = event as CustomEvent<{ row?: number; col?: number }>;
      const row = customEvent.detail?.row;
      const col = customEvent.detail?.col;
      if (typeof row !== 'number' || typeof col !== 'number') return;

      setSelection({ start: { row, col }, end: { row, col } });
      onSelectionAnchorChange?.(row, col);
    };

    window.addEventListener('patient-log-force-selection', handleForceSelection as EventListener);
    return () => {
      window.removeEventListener('patient-log-force-selection', handleForceSelection as EventListener);
    };
  }, [onSelectionAnchorChange]);

  useEffect(() => {
    const handleForceSelectionByVisit = (event: Event) => {
      const customEvent = event as CustomEvent<{ visitId?: string; col?: number }>;
      const visitId = customEvent.detail?.visitId;
      const col = customEvent.detail?.col;
      if (!visitId || typeof col !== 'number') return;

      const row = visits.findIndex((visit) => visit.id === visitId);
      if (row < 0) return;

      setSelection({ start: { row, col }, end: { row, col } });
      onSelectionAnchorChange?.(row, col);
      requestAnimationFrame(() => {
        focusHostWithoutResettingSelection({ row, col });
      });
    };

    window.addEventListener('patient-log-force-selection-by-visit', handleForceSelectionByVisit as EventListener);
    return () => {
      window.removeEventListener('patient-log-force-selection-by-visit', handleForceSelectionByVisit as EventListener);
    };
  }, [focusHostWithoutResettingSelection, onSelectionAnchorChange, visits]);

  const renderedRowCount = Math.max(totalRows, visits.length);

  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-auto log-scrollbar bg-slate-50/60 dark:bg-slate-900"
      tabIndex={0}
      onKeyDownCapture={handleInlineSelectionKeyDownCapture}
      onCopy={handleCopy}
      onCut={handleCut}
      onPaste={handlePaste}
      onKeyDown={handleSelectionKeyDown}
      onMouseDownCapture={(e) => {
        lastPointerDownAtRef.current = Date.now();
        const rowHeaderPos = parseRowHeaderId(e.target as HTMLElement);
        if (rowHeaderPos) {
          if (e.shiftKey && selection) {
            const anchorRow = selection.start.row;
            setSelection({
              start: { row: anchorRow, col: 0 },
              end: { row: rowHeaderPos.row, col: 10 },
            });
            onSelectionAnchorChange?.(anchorRow, 0);
            skipPointerSelectionCommitRef.current = true;
            isDraggingRef.current = false;
            return;
          }
          if (e.button === 2) {
            const selectedRows = getSelectedWholeRows();
            if (!selectedRows.includes(rowHeaderPos.row)) {
              setSelection(buildWholeRowSelection(rowHeaderPos.row));
              onSelectionAnchorChange?.(rowHeaderPos.row, 0);
            }
            isDraggingRef.current = false;
            return;
          }
          if (isWholeRowSelected(rowHeaderPos.row)) {
            setSelection(null);
            onSelectionAnchorChange?.(null, null);
            skipRowHeaderClickRef.current = true;
            isDraggingRef.current = false;
            return;
          }
          setSelection(buildWholeRowSelection(rowHeaderPos.row));
          onSelectionAnchorChange?.(rowHeaderPos.row, 0);
          isDraggingRef.current = true;
          return;
        }
        const pos = parseGridCellId(e.target as HTMLElement);
        if (!pos) return;
        if (e.shiftKey && selection) {
          const anchor = selection.start;
          setSelection({ start: anchor, end: pos });
          onSelectionAnchorChange?.(anchor.row, anchor.col);
          skipPointerSelectionCommitRef.current = true;
          isDraggingRef.current = false;
          return;
        }
        setSelection({ start: pos, end: pos });
        onSelectionAnchorChange?.(pos.row, pos.col);
        isDraggingRef.current = true;
      }}
      onClickCapture={(e) => {
        if (skipPointerSelectionCommitRef.current) {
          skipPointerSelectionCommitRef.current = false;
          return;
        }
        const rowHeaderPos = parseRowHeaderId(e.target as HTMLElement);
        if (rowHeaderPos) {
          if (skipRowHeaderClickRef.current) {
            skipRowHeaderClickRef.current = false;
            return;
          }
          setSelection(buildWholeRowSelection(rowHeaderPos.row));
          onSelectionAnchorChange?.(rowHeaderPos.row, 0);
          return;
        }
        const pos = parseGridCellId(e.target as HTMLElement);
        if (!pos) return;
        setSelection({ start: pos, end: pos });
        onSelectionAnchorChange?.(pos.row, pos.col);
      }}
      onFocusCapture={(e) => {
        if (skipFocusSelectionCommitRef.current) {
          return;
        }
        if (skipPointerSelectionCommitRef.current) return;
        const pos = parseGridCellId(e.target as HTMLElement);
        if (!pos) return;
        setSelection({ start: pos, end: pos });
        onSelectionAnchorChange?.(pos.row, pos.col);
      }}
      onContextMenuCapture={(e) => {
        const rowHeaderPos = parseRowHeaderId(e.target as HTMLElement);
        if (!rowHeaderPos) return;
        e.preventDefault();
        const selectedRows = getSelectedWholeRows();
        const menuRows = selectedRows.includes(rowHeaderPos.row) ? selectedRows : [rowHeaderPos.row];
        if (!selectedRows.includes(rowHeaderPos.row)) {
          setSelection(buildWholeRowSelection(rowHeaderPos.row));
          onSelectionAnchorChange?.(rowHeaderPos.row, 0);
        }
        setRowHeaderMenu({ row: rowHeaderPos.row, rows: menuRows, x: e.clientX, y: e.clientY });
      }}
      onMouseMoveCapture={(e) => {
        if (!isDraggingRef.current) return;
        const rowHeaderPos = parseRowHeaderId(e.target as HTMLElement);
        if (rowHeaderPos) {
          setSelection((prev) => prev ? { ...prev, end: { row: rowHeaderPos.row, col: 10 } } : prev);
          return;
        }
        const pos = parseGridCellId(e.target as HTMLElement);
        if (!pos) return;
        setSelection((prev) => prev ? { ...prev, end: pos } : prev);
      }}
      onMouseUpCapture={() => {
        isDraggingRef.current = false;
      }}
    >
      <table ref={tableRef} className="w-max border-collapse table-fixed bg-white/90 dark:bg-slate-900">
        {columnWidths && (
          <colgroup>
            <col style={{ width: '34px' }} />
            {columnWidths.map((w, i) => {
              if (!showTimerColumn && i === 9) return null;
              return (
                <col key={i} style={{ width: `${w}px` }} />
              );
            })}
          </colgroup>
        )}
        <PatientLogTableHeader
          onResizeStart={onResizeStart}
          isResizing={isResizing}
          activeResizeColIndex={activeResizeColIndex}
          showTimerColumn={showTimerColumn}
        />
        <tbody>
          {Array.from({ length: renderedRowCount }).map((_, index) => {
            const visit = visits[index];
            if (!visit) {
              return (
                <PatientLogRow
                  key={`draft-row-${index}-${visits.length}`}
                  rowIndex={index}
                  isRowSelected={!!selection && Math.min(selection.start.row, selection.end.row) <= index && index <= Math.max(selection.start.row, selection.end.row)}
                  isDraft={true}
                  onUpdate={onUpdate}
                  onCreate={(updates, colIndex, navDirection) => handleDraftCreate(index, updates, colIndex, navDirection)}
                  onSelectLog={(id) => onSelectLog(id, null)}
                  activeBedIds={activeBedIds}
                  isBedActivationDisabled={isBedActivationDisabled}
                  showTimerColumn={showTimerColumn}
                  statusOptions={normalizedStatusOptions}
                  patientNameSuggestions={patientNameSuggestions}
                  patientNameAutofillMap={patientNameAutofillMap}
                  memoSuggestions={memoSuggestions}
                  specialNoteSuggestions={specialNoteSuggestions}
                  onChartAutofillSuppressionChange={onChartAutofillSuppressionChange}
                />
              );
            }

            const canUseBedRuntime = !isBedActivationDisabled && isTodayView;
            const rowStatus = canUseBedRuntime ? getRowStatus(visit.id, visit.bed_id) : 'none';
            const bed = canUseBedRuntime && visit.bed_id ? beds.find(b => b.id === visit.bed_id) : undefined;

            const {
              activeStepColorClass,
              activeStepBgClass,
              activeStepIndex,
              isLastStep,
              timerStatus
            } = getRowActiveStatus(bed, rowStatus, presets);

            let handleNextStep: (() => void) | undefined = undefined;
            let handlePrevStep: (() => void) | undefined = undefined;
            let handleClearBed: (() => void) | undefined = undefined;

            // 배드 preset 기반 처방이 있으면 로그 문자열보다 우선해 컨트롤 표시 기준을 맞춘다.
            const bedPreset = bed ? (bed.customPreset || presets.find((p) => p.id === bed.currentPresetId)) : undefined;
            const bedTreatmentText = bedPreset?.steps?.length
              ? generateTreatmentString(bedPreset.steps)
              : '';
            const hasTreatment = !!(bedTreatmentText || (visit.treatment_name && visit.treatment_name.trim() !== ''));
            if (bed && hasTreatment && (rowStatus === 'active' || rowStatus === 'completed')) {
              if (onNextStep) handleNextStep = () => onNextStep(bed.id);
              if (onPrevStep) handlePrevStep = () => onPrevStep(bed.id);
              if (onClearBed) handleClearBed = () => onClearBed(bed.id);
            }

            return (
              <PatientLogRow
                key={`visit-row-${visit.id}`}
                rowIndex={index}
                isRowSelected={!!selection && Math.min(selection.start.row, selection.end.row) <= index && index <= Math.max(selection.start.row, selection.end.row)}
                visit={visit}
                isDraft={false}
                rowStatus={rowStatus}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onSelectLog={onSelectLog}
                onMovePatient={onMovePatient}
                onEditActive={onEditActive}
                activeBedIds={activeBedIds}
                activeStepColor={activeStepColorClass}
                activeStepBgColor={activeStepBgClass}
                activeStepIndex={activeStepIndex}
                isLastStep={isLastStep}
              timerStatus={timerStatus}
              remainingTime={bed?.remainingTime}
              bed={bed}
              presets={presets}
              isPaused={bed?.isPaused}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onClearBed={handleClearBed}
                isBedActivationDisabled={isBedActivationDisabled}
                onBulkAuthorUpdate={handleBulkAuthorUpdate}
                showTimerColumn={showTimerColumn}
                statusOptions={normalizedStatusOptions}
                patientNameSuggestions={patientNameSuggestions}
                patientNameAutofillMap={patientNameAutofillMap}
                memoSuggestions={memoSuggestions}
                specialNoteSuggestions={specialNoteSuggestions}
                isChartAutofillSuppressed={suppressedChartAutofillVisitIds.includes(visit.id)}
                onChartAutofillSuppressionChange={onChartAutofillSuppressionChange}
              />
            );
          })}

          {/* +10행 추가 버튼 */}
          <tr>
            <td colSpan={11} className="p-0 border-b border-gray-300 dark:border-slate-600">
              <button
                onClick={() => setTotalRows(prev => prev + 10)}
                className="w-full py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-900/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                10행 추가
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {rowHeaderMenu && (
        <div className="fixed inset-0 z-[9999]" onClick={closeRowHeaderMenu}>
          <div
            className="absolute min-w-[148px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl p-1.5"
            style={{ top: rowHeaderMenu.y, left: rowHeaderMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => void handleInsertRow(rowHeaderMenu.row, 'above')}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              위로 삽입
            </button>
            <button
              type="button"
              onClick={() => void handleInsertRow(rowHeaderMenu.row, 'below')}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              아래로 삽입
            </button>
            <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
            <button
              type="button"
              onClick={() => handleDeleteRows(rowHeaderMenu.rows)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              행 삭제{rowHeaderMenu.rows.length > 1 ? ` (${rowHeaderMenu.rows.length}개)` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
