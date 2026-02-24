
import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { PatientVisit, BedState, Preset } from '../../types';
import { PatientLogRow } from './PatientLogRow';
import { PatientLogTableHeader } from './PatientLogTableHeader';
import { getRowActiveStatus } from '../../utils/patientLogUtils';
import { useColumnResize, FLEX_COL_INDEX } from '../../hooks/useColumnResize';

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
  onClearBed
}) => {
  const [totalRows, setTotalRows] = useState(120);
  const activeBedIds = beds.filter(b => b.status !== 'IDLE').map(b => b.id);

  // Column resize (desktop & tablet portrait)
  const tableRef = useRef<HTMLTableElement>(null);
  const { columnWidths, isResizing, onResizeStart } = useColumnResize(tableRef);

  // Auto-focus logic for new row creation
  // Stores { rowOffset, colIndex }
  // rowOffset = 1 (vertical: jump to new draft), rowOffset = 0 (horizontal: stay on created row)
  const focusTargetRef = useRef<{ rowOffset: number, colIndex: number } | null>(null);
  const prevVisitsLengthRef = useRef(visits.length);

  useEffect(() => {
    // If visits length increased, it means a row was added.
    if (visits.length > prevVisitsLengthRef.current && focusTargetRef.current !== null) {
      const baseRowIndex = prevVisitsLengthRef.current; // Index of the row just created (which was previously the draft row)
      const targetRowIndex = baseRowIndex + focusTargetRef.current.rowOffset;
      const targetColIndex = focusTargetRef.current.colIndex;

      // Small delay to allow DOM to update
      setTimeout(() => {
        const targetEl = document.querySelector(`[data-grid-id="${targetRowIndex}-${targetColIndex}"]`) as HTMLElement;
        if (targetEl) {
          targetEl.focus();
          // If it's an input, select text
          if (targetEl.tagName === 'INPUT') {
            (targetEl as HTMLInputElement).select();
          }
        }
        focusTargetRef.current = null; // Reset
      }, 50);
    }
    prevVisitsLengthRef.current = visits.length;
  }, [visits.length]);

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

  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto xl:overflow-x-hidden log-scrollbar bg-white dark:bg-slate-900">
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
            <td colSpan={8} className="p-0 border-b border-gray-300 dark:border-slate-600">
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
