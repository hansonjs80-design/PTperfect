
import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { PatientVisit, BedState, Preset } from '../../types';
import { PatientLogRow } from './PatientLogRow';
import { PatientLogTableHeader } from './PatientLogTableHeader';
import { getRowActiveStatus } from '../../utils/patientLogUtils';
import { useColumnResize, FLEX_COL_INDEX } from '../../hooks/useColumnResize';

type GridCellPos = { row: number; col: number };
type GridSelection = { start: GridCellPos; end: GridCellPos } | null;

const SELECTABLE_COLS = new Set([1, 2, 3, 4, 5, 8]);

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

interface PatientLogTableProps {
  visits: PatientVisit[];
  beds: BedState[];
  presets: Preset[];
  getRowStatus: (visitId: string, bedId: number | null) => 'active' | 'completed' | 'none';
  onUpdate: (id: string, updates: Partial<PatientVisit>, skipBedSync?: boolean) => void;
  onDelete: (id: string) => void;
  onCreate: (updates: Partial<PatientVisit>) => Promise<string>;
  onSelectLog: (id: string, bedId?: number | null) => void;
  onMovePatient: (visitId: string, currentBedId: number, newBedId: number) => void;
  onEditActive?: (bedId: number) => void;
  onNextStep?: (bedId: number) => void;
  onPrevStep?: (bedId: number) => void;
  onClearBed?: (bedId: number) => void;
  onSelectionAnchorChange?: (rowIndex: number | null, colIndex: number | null) => void;
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
  onSelectionAnchorChange
}) => {
  const [totalRows, setTotalRows] = useState(120);
  const [selection, setSelection] = useState<GridSelection>(null);
  const activeBedIds = beds.filter(b => b.status !== 'IDLE').map(b => b.id);
  const isDraggingRef = useRef(false);

  // Column resize (desktop & tablet portrait)
  const tableRef = useRef<HTMLTableElement>(null);
  const { columnWidths, isResizing, onResizeStart } = useColumnResize(tableRef);

  // Auto-focus logic for new row creation
  // Stores { rowOffset, colIndex }
  // rowOffset = 1 (vertical: jump to new draft), rowOffset = 0 (horizontal: stay on created row)
  const focusTargetRef = useRef<{ rowOffset: number, colIndex: number } | null>(null);
  const prevVisitsLengthRef = useRef(visits.length);
  const pendingAutoFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerDownAtRef = useRef(0);

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
      case 1: return visit.patient_name || '';
      case 2: return visit.body_part || '';
      case 3: return visit.treatment_name || '';
      case 4: return visit.memo || '';
      case 5: return visit.special_note || '';
      case 8: return visit.author || '';
      default: return '';
    }
  }, []);

  const setVisitCellText = useCallback((visit: PatientVisit, col: number, text: string) => {
    switch (col) {
      case 1:
        onUpdate(visit.id, { patient_name: text }, true);
        return;
      case 2:
        onUpdate(visit.id, { body_part: text }, true);
        return;
      case 3:
        onUpdate(visit.id, { treatment_name: text }, true);
        return;
      case 4:
        onUpdate(visit.id, { memo: text }, true);
        return;
      case 5:
        onUpdate(visit.id, { special_note: text }, true);
        return;
      case 8:
        onUpdate(visit.id, { author: text }, true);
        return;
      default:
        return;
    }
  }, [onUpdate]);

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

  const handleGridPaste = useCallback((raw: string) => {
    if (!raw) return;
    const bounds = normalizeSelectionBounds(selection);
    const anchor = bounds ? { row: bounds.rowMin, col: bounds.colMin } : null;
    if (!anchor) return;

    const parsedRows = raw.replace(/\r/g, '').split('\n').filter((line) => line.length > 0).map((line) => line.split('\t'));
    if (parsedRows.length === 0) return;

    parsedRows.forEach((line, rIdx) => {
      const row = anchor.row + rIdx;
      const visit = visits[row];
      if (!visit) return;

      line.forEach((cellText, cIdx) => {
        const col = anchor.col + cIdx;
        if (!SELECTABLE_COLS.has(col)) return;
        setVisitCellText(visit, col, cellText);
      });
    });
  }, [selection, visits, setVisitCellText]);

  const handleCopy = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const active = document.activeElement as HTMLInputElement | null;
    if (active?.tagName === 'INPUT' && !active.readOnly) return;

    const text = handleGridClipboardCopy(false);
    if (!text) return;

    e.preventDefault();
    e.clipboardData.setData('text/plain', text);
    try { await navigator.clipboard?.writeText(text); } catch { /* noop */ }
  }, [handleGridClipboardCopy]);

  const handleCut = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const active = document.activeElement as HTMLInputElement | null;
    if (active?.tagName === 'INPUT' && !active.readOnly) return;

    const text = handleGridClipboardCopy(true);
    if (!text) return;

    e.preventDefault();
    e.clipboardData.setData('text/plain', text);
    try { await navigator.clipboard?.writeText(text); } catch { /* noop */ }
  }, [handleGridClipboardCopy]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const active = document.activeElement as HTMLInputElement | null;
    if (active?.tagName === 'INPUT' && !active.readOnly) return;

    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    handleGridPaste(text);
  }, [handleGridPaste]);



  const handleSelectionKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const active = document.activeElement as HTMLInputElement | null;
    if (active?.tagName === 'INPUT' && !active.readOnly) return;

    const isPlainTypingKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    const isEditTriggerKey = isPlainTypingKey || e.key === 'Backspace' || e.key === 'Delete';
    if (isEditTriggerKey) {
      const bounds = normalizeSelectionBounds(selection);
      const anchor = bounds ? { row: bounds.rowMin, col: bounds.colMin } : null;
      if (anchor) {
        const host = document.querySelector(`[data-grid-id="${anchor.row}-${anchor.col}"]`) as HTMLElement | null;
        const inputTarget = host?.tagName === 'INPUT'
          ? host as HTMLInputElement
          : (host?.querySelector('input') as HTMLInputElement | null);

        if (inputTarget) {
          inputTarget.focus();
          const replay = new KeyboardEvent('keydown', { key: e.key, bubbles: true, cancelable: true });
          inputTarget.dispatchEvent(replay);
          e.preventDefault();
          e.stopPropagation();
          return;
        }
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

    const bounds = normalizeSelectionBounds(selection);
    if (!bounds) return;

    e.preventDefault();

    for (let row = bounds.rowMin; row <= bounds.rowMax; row++) {
      const visit = visits[row];
      if (!visit) continue;

      for (let col = bounds.colMin; col <= bounds.colMax; col++) {
        if (!SELECTABLE_COLS.has(col)) continue;
        setVisitCellText(visit, col, '');
      }
    }
  }, [selection, visits, setVisitCellText, onSelectionAnchorChange]);

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

    const previouslyHighlighted = Array.from(document.querySelectorAll('[data-grid-id][data-grid-selection="true"]')) as HTMLElement[];
    previouslyHighlighted.forEach((host) => {
      host.removeAttribute('data-grid-selection');
      host.style.boxShadow = '';
      host.style.backgroundColor = '';
      host.style.borderRadius = '';
    });

    selected.forEach((id) => {
      const host = document.querySelector(`[data-grid-id="${id}"]`) as HTMLElement | null;
      if (!host) return;
      host.setAttribute('data-grid-selection', 'true');
      host.style.boxShadow = 'inset 0 0 0 2px rgb(14 165 233)';
      host.style.backgroundColor = 'rgba(14, 165, 233, 0.08)';
      host.style.borderRadius = '2px';
    });
  }, [selection, visits.length, totalRows]);

  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-auto xl:overflow-x-hidden log-scrollbar bg-white dark:bg-slate-900"
      tabIndex={0}
      onCopy={handleCopy}
      onCut={handleCut}
      onPaste={handlePaste}
      onKeyDown={handleSelectionKeyDown}
      onMouseDownCapture={(e) => {
        lastPointerDownAtRef.current = Date.now();
        const pos = parseGridCellId(e.target as HTMLElement);
        if (!pos) return;
        setSelection({ start: pos, end: pos });
        onSelectionAnchorChange?.(pos.row, pos.col);
        isDraggingRef.current = true;
      }}
      onClickCapture={(e) => {
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
      onMouseMoveCapture={(e) => {
        if (!isDraggingRef.current) return;
        const pos = parseGridCellId(e.target as HTMLElement);
        if (!pos) return;
        setSelection((prev) => prev ? { ...prev, end: pos } : prev);
      }}
      onMouseUpCapture={() => {
        isDraggingRef.current = false;
      }}
      onMouseLeave={() => {
        isDraggingRef.current = false;
      }}
    >
      <table ref={tableRef} className="w-full min-w-[500px] md:min-w-full border-collapse table-fixed">
        {columnWidths && (
          <colgroup>
            {columnWidths.map((w, i) => (
              <col key={i} style={i !== FLEX_COL_INDEX ? { width: `${w}px` } : undefined} />
            ))}
          </colgroup>
        )}
        <PatientLogTableHeader onResizeStart={onResizeStart} isResizing={isResizing} />
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

            // Only show control buttons if the visit has a treatment_name
            // (bed assigned without treatment should NOT show activation buttons)
            const hasTreatment = !!visit.treatment_name && visit.treatment_name.trim() !== '';
            if (bed && hasTreatment && (rowStatus === 'active' || rowStatus === 'completed')) {
              if (onNextStep) handleNextStep = () => onNextStep(bed.id);
              if (onPrevStep) handlePrevStep = () => onPrevStep(bed.id);
              if (onClearBed) handleClearBed = () => onClearBed(bed.id);
            }

            return (
              <PatientLogRow
                key={visit.id}
                rowIndex={index}
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
                onBulkAuthorUpdate={handleBulkAuthorUpdate}
              />
            );
          })}

          {Array.from({ length: Math.max(0, totalRows - visits.length) }).map((_, index) => (
            <PatientLogRow
              key={`draft-${index}`}
              rowIndex={visits.length + index}
              isDraft={true}
              onCreate={handleDraftCreate}
              onSelectLog={(id) => onSelectLog(id, null)}
              activeBedIds={activeBedIds}
            />
          ))}

          {/* +10행 추가 버튼 */}
          <tr>
            <td colSpan={10} className="p-0 border-b border-gray-300 dark:border-slate-600">
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
    </div>
  );
});
