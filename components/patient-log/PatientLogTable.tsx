
import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { PatientVisit, BedState, Preset } from '../../types';
import { PatientLogRow } from './PatientLogRow';
import { PatientLogTableHeader } from './PatientLogTableHeader';
import { getRowActiveStatus } from '../../utils/patientLogUtils';
import { useColumnResize } from '../../hooks/useColumnResize';
import { generateTreatmentString } from '../../utils/bedUtils';
import { normalizeUpperEnglishKeyInput } from '../../utils/keyboardLayout';

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

const buildStatusText = (visit: PatientVisit) => STATUS_TEXT_PAIRS
  .filter(([key]) => !!visit[key])
  .map(([, label]) => label)
  .join(', ');

const parseStatusText = (raw: string): Partial<PatientVisit> => {
  const normalized = raw.trim();
  const baseFlags = Object.fromEntries(
    STATUS_TEXT_PAIRS.map(([key]) => [key, false])
  ) as Partial<PatientVisit>;

  if (!normalized) return baseFlags;

  const tokens = normalized
    .split(/[,\n/+\s]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const matchedKeys = new Set<keyof PatientVisit>();
  for (const token of tokens) {
    const matched = STATUS_TEXT_PAIRS.find(([, label]) => label === token);
    if (matched) {
      matchedKeys.add(matched[0]);
    }
  }

  STATUS_TEXT_PAIRS.forEach(([key]) => {
    baseFlags[key] = matchedKeys.has(key);
  });

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
  if (!gridHost) return null;
  const id = gridHost.getAttribute('data-grid-id');
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

interface PatientLogTableProps {
  visits: PatientVisit[];
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
  draftRowKey?: number;
}

export const PatientLogTable: React.FC<PatientLogTableProps> = memo(({
  visits,
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
  draftRowKey = 0
}) => {
  const [totalRows, setTotalRows] = useState(120);
  const [selection, setSelection] = useState<GridSelection>(null);
  const [rowHeaderMenu, setRowHeaderMenu] = useState<{ row: number; x: number; y: number } | null>(null);
  const showTimerColumn = false;
  const activeBedIds = beds.filter(b => b.status !== 'IDLE').map(b => b.id);
  const isDraggingRef = useRef(false);
  const skipRowHeaderClickRef = useRef(false);

  // Column resize (desktop & tablet portrait)
  const tableRef = useRef<HTMLTableElement>(null);
  const { columnWidths, isResizing, activeResizeColIndex, onResizeStart } = useColumnResize(tableRef);

  // Auto-focus logic for new row creation
  // Stores { rowOffset, colIndex }
  // rowOffset = 1 (vertical: jump to new draft), rowOffset = 0 (horizontal: stay on created row)
  const focusTargetRef = useRef<{ rowOffset: number, colIndex: number } | null>(null);
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


  // Expose cancel function to parent so search shortcuts can prevent auto-focus stealing
  useEffect(() => {
    if (cancelAutoFocusRef) {
      cancelAutoFocusRef.current = () => {
        focusTargetRef.current = null;
        if (pendingAutoFocusTimerRef.current) {
          clearTimeout(pendingAutoFocusTimerRef.current);
          pendingAutoFocusTimerRef.current = null;
        }
      };
    }
  });

  useEffect(() => {
    // If visits length increased, it means a row was added.
    if (visits.length > prevVisitsLengthRef.current && focusTargetRef.current !== null) {
      const baseRowIndex = prevVisitsLengthRef.current; // Index of the row just created (which was previously the draft row)
      const targetRowIndex = baseRowIndex + focusTargetRef.current.rowOffset;
      const targetColIndex = focusTargetRef.current.colIndex;

      // Small delay to allow DOM to update
      if (pendingAutoFocusTimerRef.current) {
        clearTimeout(pendingAutoFocusTimerRef.current);
      }

      pendingAutoFocusTimerRef.current = setTimeout(() => {
        // If the user manually clicked very recently, never steal focus to another cell.
        if (Date.now() - lastPointerDownAtRef.current < 250) {
          focusTargetRef.current = null;
          return;
        }

        // If a modal overlay is open (search / memo history) or a modal transition is in progress, never steal focus.
        if (document.querySelector('[data-modal-overlay="true"]') || document.body.getAttribute('data-prevent-autofocus') === 'true') {
          focusTargetRef.current = null;
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
            // If it's an input, select text
            if (targetEl.tagName === 'INPUT') {
              (targetEl as HTMLInputElement).select();
            }
          }
        }
        focusTargetRef.current = null; // Reset
      }, 50);
    }
    prevVisitsLengthRef.current = visits.length;
  }, [visits.length]);



  useEffect(() => {
    return () => {
      if (pendingAutoFocusTimerRef.current) {
        clearTimeout(pendingAutoFocusTimerRef.current);
      }
    };
  }, []);

  const handleDraftCreate = async (updates: Partial<PatientVisit>, colIndex?: number, navDirection?: 'down' | 'right' | 'left') => {
    if (colIndex !== undefined) {
      if (navDirection === 'left') {
        // Horizontal Left: Stay on the same row (newly created), go to previous column
        focusTargetRef.current = { rowOffset: 0, colIndex: colIndex - 1 };
      } else if (navDirection === 'right') {
        // Horizontal Right: Stay on the same row (newly created), go to next column
        focusTargetRef.current = { rowOffset: 0, colIndex: colIndex + 1 };
      } else {
        // Vertical (or default): Jump to the new draft row below
        focusTargetRef.current = { rowOffset: 1, colIndex: colIndex };
      }
    }
    return await onCreate(updates);
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
      case 6: return buildStatusText(visit);
      case 7: return visit.memo || '';
      case 8: return visit.special_note || '';
      case 10: return visit.author || '';
      default: return '';
    }
  }, []);


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

  const setVisitCellText = useCallback((visit: PatientVisit, col: number, text: string) => {
    switch (col) {
      case 0: {
        const trimmed = text.trim();
        if (!trimmed) {
          onUpdate(visit.id, { bed_id: null }, isBedActivationDisabled);
          return;
        }
        const parsed = Number(trimmed);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 11) return;
        onUpdate(visit.id, { bed_id: parsed }, isBedActivationDisabled);
        return;
      }
      case 1:
        onUpdate(visit.id, { chart_number: text }, true);
        return;
      case 2:
        onUpdate(visit.id, { patient_name: text }, true);
        return;
      case 3:
        onUpdate(visit.id, { gender: text.toUpperCase().slice(0, 1) }, true);
        return;
      case 4:
        onUpdate(visit.id, { body_part: text }, true);
        return;
      case 5: {
        // 활성 행의 처방 변경(붙여넣기 포함)은 배드카드에도 즉시 반영
        // 단, 세트 배지명이 함께 들어와도 처방 목록 문자열만 반영한다.
        const normalizedTreatment = normalizeTreatmentPasteText(text);
        if (normalizedTreatment === '') {
          window.dispatchEvent(new CustomEvent('patient-log-clear-treatment-display', {
            detail: { visitId: visit.id },
          }));
        }
        const isActiveRow = getRowStatus(visit.id, visit.bed_id) === 'active';
        const shouldSkipBedSync = isBedActivationDisabled || !isActiveRow || !visit.bed_id;

        onUpdate(visit.id, { treatment_name: normalizedTreatment }, shouldSkipBedSync);

        // 활성 행 처방을 비우면 배드 카드/행도 즉시 비활성화한다.
        if (!isBedActivationDisabled && normalizedTreatment === '' && isActiveRow && visit.bed_id) {
          onClearBed?.(visit.bed_id);
        }
        return;
      }
      case 7:
        onUpdate(visit.id, { memo: text }, true);
        return;
      case 6: {
        const nextFlags = parseStatusText(text);
        const shouldSkipBedSync = isBedActivationDisabled || getRowStatus(visit.id, visit.bed_id) !== 'active';
        onUpdate(visit.id, nextFlags, shouldSkipBedSync);
        return;
      }
      case 8:
        onUpdate(visit.id, { special_note: text }, true);
        return;
      case 10:
        onUpdate(visit.id, { author: normalizeUpperEnglishKeyInput(text).slice(0, 4) }, true);
        return;
      default:
        return;
    }
  }, [onUpdate, getRowStatus, normalizeTreatmentPasteText, onClearBed, isBedActivationDisabled]);

  const handleGridClipboardCopy = useCallback((shouldCut: boolean) => {
    const bounds = normalizeSelectionBounds(selection);
    if (!bounds) return '';

    const rows: string[] = [];
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
          setVisitCellText(visit, col, '');
        }
      }
      rows.push(cols.join('\t'));
    }

    return rows.join('\n');
  }, [selection, visits, getVisitCellText, setVisitCellText]);

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
          Object.assign(updates, parseStatusText(normalized));
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
  }, [isBedActivationDisabled]);

  const handleGridPaste = useCallback(async (raw: string) => {
    if (!raw) return;
    const bounds = normalizeSelectionBounds(selection);
    const anchor = bounds ? { row: bounds.rowMin, col: bounds.colMin } : null;
    if (!anchor) return;

    const parsedRows = raw.replace(/\r/g, '').split('\n').filter((line) => line.length > 0).map((line) => line.split('\t'));
    if (parsedRows.length === 0) return;

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
        setVisitCellText(visit, col, cellText);
      });
    }
  }, [selection, visits, setVisitCellText, buildDraftUpdatesForPasteRow, onCreate]);


  const isActiveInputEditing = (input: HTMLInputElement | null) => {
    if (!input || input.tagName !== 'INPUT') return false;
    return input.dataset.directEditing === 'true';
  };
  const handleCopy = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const active = document.activeElement as HTMLInputElement | null;
    if (isActiveInputEditing(active)) return;

    const text = handleGridClipboardCopy(false);
    if (!text) return;

    e.preventDefault();
    e.clipboardData.setData('text/plain', text);
    try { await navigator.clipboard?.writeText(text); } catch { /* noop */ }
  }, [handleGridClipboardCopy]);

  const handleCut = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const active = document.activeElement as HTMLInputElement | null;
    if (isActiveInputEditing(active)) return;

    const text = handleGridClipboardCopy(true);
    if (!text) return;

    e.preventDefault();
    e.clipboardData.setData('text/plain', text);
    try { await navigator.clipboard?.writeText(text); } catch { /* noop */ }
  }, [handleGridClipboardCopy]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const active = document.activeElement as HTMLInputElement | null;
    if (isActiveInputEditing(active)) return;

    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    void handleGridPaste(text);
  }, [handleGridPaste]);



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
      return;
    }

    if (isShortcut && keyLower === 'v') {
      e.preventDefault();
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

    const bounds = normalizeSelectionBounds(selection);
    const anchor = bounds ? { row: bounds.rowMin, col: bounds.colMin } : null;
    const isStatusMenuOpen = document.body.dataset.patientStatusMenuOpen === 'true';

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (isStatusMenuOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const current = anchor ?? parseGridCellId(document.activeElement as HTMLElement | null);
      if (!current) return;

      const direction =
        e.key === 'ArrowUp' ? 'up' :
        e.key === 'ArrowDown' ? 'down' :
        e.key === 'ArrowLeft' ? 'left' : 'right';
      const nextPos = findVisibleGridPos(current, direction, totalRows);
      if (!nextPos) return;

      e.preventDefault();
      setSelection({ start: nextPos, end: nextPos });
      onSelectionAnchorChange?.(nextPos.row, nextPos.col);
      const host = document.querySelector(`[data-grid-id="${nextPos.row}-${nextPos.col}"]`) as HTMLElement | null;
      host?.focus();
      return;
    }

    const isPlainTypingKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (isPlainTypingKey && anchor) {
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
    if (!bounds) return;

    e.preventDefault();

    const selectedCols: number[] = [];
    for (let col = bounds.colMin; col <= bounds.colMax; col++) {
      if (SELECTABLE_COLS.has(col)) selectedCols.push(col);
    }

    // 삭제 시 처방 목록(5열)을 배드 번호(0열)보다 먼저 비워야
    // 활성 배드에 연결된 처방도 함께 정리된다.
    selectedCols.sort((a, b) => {
      if (a === 5 && b === 0) return -1;
      if (a === 0 && b === 5) return 1;
      return a - b;
    });

    for (let row = bounds.rowMin; row <= bounds.rowMax; row++) {
      const visit = visits[row];
      if (!visit) continue;

      for (const col of selectedCols) {
        setVisitCellText(visit, col, '');
      }
    }
  }, [selection, visits, totalRows, setVisitCellText, onSelectionAnchorChange, handleGridClipboardCopy, handleGridPaste]);

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

    const previouslyHighlightedHosts = Array.from(document.querySelectorAll('[data-grid-id][data-grid-selection="true"]')) as HTMLElement[];
    previouslyHighlightedHosts.forEach((host) => {
      host.removeAttribute('data-grid-selection');
      host.style.boxShadow = '';
      host.style.outline = '';
      host.style.outlineOffset = '';
      host.style.backgroundColor = '';
      host.style.borderRadius = '';
    });

    const previouslyHighlightedCells = Array.from(document.querySelectorAll('td[data-grid-selection="true"]')) as HTMLElement[];
    previouslyHighlightedCells.forEach((cell) => {
      cell.removeAttribute('data-grid-selection');
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
  }, [selection, visits.length, totalRows]);

  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-auto log-scrollbar bg-slate-50/60 dark:bg-slate-900"
      tabIndex={0}
      onCopy={handleCopy}
      onCut={handleCut}
      onPaste={handlePaste}
      onKeyDown={handleSelectionKeyDown}
      onMouseDownCapture={(e) => {
        lastPointerDownAtRef.current = Date.now();
        const rowHeaderPos = parseRowHeaderId(e.target as HTMLElement);
        if (rowHeaderPos) {
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
        setSelection({ start: pos, end: pos });
        onSelectionAnchorChange?.(pos.row, pos.col);
        isDraggingRef.current = true;
      }}
      onClickCapture={(e) => {
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
        const pos = parseGridCellId(e.target as HTMLElement);
        if (!pos) return;
        setSelection({ start: pos, end: pos });
        onSelectionAnchorChange?.(pos.row, pos.col);
      }}
      onContextMenuCapture={(e) => {
        const rowHeaderPos = parseRowHeaderId(e.target as HTMLElement);
        if (!rowHeaderPos) return;
        e.preventDefault();
        setSelection(buildWholeRowSelection(rowHeaderPos.row));
        onSelectionAnchorChange?.(rowHeaderPos.row, 0);
        setRowHeaderMenu({ row: rowHeaderPos.row, x: e.clientX, y: e.clientY });
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
              if (!showTimerColumn && i === 8) return null;
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
          {visits.map((visit, index) => {
            const rowStatus = getRowStatus(visit.id, visit.bed_id);
            const bed = visit.bed_id ? beds.find(b => b.id === visit.bed_id) : undefined;

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
                key={visit.id}
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
              />
            );
          })}

          {Array.from({ length: Math.max(0, totalRows - visits.length) }).map((_, index) => (
            <PatientLogRow
              key={`draft-${index}-${draftRowKey}`}
              rowIndex={visits.length + index}
              isRowSelected={!!selection && Math.min(selection.start.row, selection.end.row) <= (visits.length + index) && (visits.length + index) <= Math.max(selection.start.row, selection.end.row)}
              isDraft={true}
              onCreate={handleDraftCreate}
              onSelectLog={(id) => onSelectLog(id, null)}
              activeBedIds={activeBedIds}
              isBedActivationDisabled={isBedActivationDisabled}
              showTimerColumn={showTimerColumn}
            />
          ))}

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
              onClick={() => handleDeleteRow(rowHeaderMenu.row)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              행 삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
