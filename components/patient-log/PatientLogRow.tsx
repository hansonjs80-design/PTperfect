
import React, { memo, useState, useRef, useEffect } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import { EditableCell } from './EditableCell';
import { BedSelectorCell } from './BedSelectorCell';
import { TreatmentSelectorCell } from './TreatmentSelectorCell'; 
import { PatientStatusCell } from './PatientStatusCell';
import { PatientVisit } from '../../types';
import { useGridNavigation } from '../../hooks/useGridNavigation';

interface PatientLogRowProps {
  rowIndex: number;
  visit?: PatientVisit;
  isDraft?: boolean;
  rowStatus?: 'active' | 'completed' | 'none';
  onUpdate?: (id: string, updates: Partial<PatientVisit>, skipBedSync?: boolean) => void;
  onDelete?: (id: string) => void;
  onCreate?: (updates: Partial<PatientVisit>, colIndex?: number, navDirection?: 'down' | 'right' | 'left') => Promise<string>;
  onSelectLog?: (id: string, bedId?: number | null) => void;
  onMovePatient?: (visitId: string, currentBedId: number, newBedId: number) => void;
  onEditActive?: (bedId: number) => void;
  activeBedIds?: number[];
  activeStepColor?: string;
  activeStepIndex?: number;
  isLastStep?: boolean;
  timerStatus?: 'normal' | 'warning' | 'overtime';
  onNextStep?: () => void;
  onPrevStep?: () => void;
  onClearBed?: () => void;
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
  activeStepIndex = -1,
  isLastStep = false,
  timerStatus = 'normal',
  onNextStep,
  onPrevStep,
  onClearBed
}) => {
  const { handleGridKeyDown } = useGridNavigation(8);
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle');
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  const handleAssign = async (newBedId: number) => {
    // Convert 0 (from "Unassign" button) to null for DB
    const bedIdToSave = newBedId === 0 ? null : newBedId;

    if (isDraft && onCreate) {
       await onCreate({ bed_id: bedIdToSave }, 0); 
    } else if (!isDraft && visit && onUpdate) {
       onUpdate(visit.id, { bed_id: bedIdToSave });
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

  const handleChange = async (field: keyof PatientVisit, value: string, skipSync: boolean, colIndex: number, navDirection?: 'down' | 'right' | 'left') => {
     if (isDraft && onCreate) {
        await onCreate({ [field]: value }, colIndex, navDirection);
     } else if (!isDraft && visit && onUpdate) {
        onUpdate(visit.id, { [field]: value }, skipSync);
     }
  };

  const handleTreatmentTextCommit = async (val: string) => {
     if (isDraft && onCreate) {
        await onCreate({ treatment_name: val }, 3);
        return;
     } 
     
     if (!isDraft && visit && onUpdate) {
        const isAssignmentMode = !!visit.bed_id && (!visit.treatment_name || visit.treatment_name.trim() === '');
        onUpdate(visit.id, { treatment_name: val }, !isAssignmentMode);
     }
  };

  const handleTreatmentSelectorOpen = async () => {
     if (rowStatus === 'active' && visit && visit.bed_id && onEditActive) {
         onEditActive(visit.bed_id);
         return;
     }

     if (isDraft && onCreate) {
        const newId = await onCreate({}, 3);
        if (onSelectLog) onSelectLog(newId);
        return;
     } 
     
     if (!isDraft && visit && onSelectLog) {
        if (visit.bed_id && (!visit.treatment_name || visit.treatment_name.trim() === '')) {
            onSelectLog(visit.id, visit.bed_id); 
        } 
        else {
            onSelectLog(visit.id, null); 
        }
     }
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
      handleGridKeyDown(e, rowIndex, 7);
    }
  };

  // Row Styling Logic
  // Using transition-colors for smooth hover effect
  let rowClasses = 'group transition-colors duration-75 border-b border-gray-300 dark:border-slate-600 h-[36px] '; 
  
  if (rowStatus === 'active') {
    // Active Row: Blue tint -> Darker Blue on Hover
    rowClasses += 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/30';
  } else if (rowStatus === 'completed') {
    // Completed Row: Gray tint -> Darker Gray on Hover
    rowClasses += 'bg-slate-50 dark:bg-slate-800/50 opacity-80 hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700';
  } else {
    // Default Row: White -> Distinct Gray on Hover
    rowClasses += 'bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800';
  }

  if (isDraft) {
      rowClasses += ' opacity-60 hover:opacity-100';
  }

  const isNoBedAssigned = !visit?.bed_id;
  const hasTreatment = !!visit?.treatment_name && visit.treatment_name.trim() !== '';
  const isLogEditMode = !isDraft && !!visit?.bed_id && hasTreatment && rowStatus !== 'active';
  
  let dotColorClass = 'bg-brand-500';
  if (timerStatus === 'warning') dotColorClass = 'bg-orange-500';
  if (timerStatus === 'overtime') dotColorClass = 'bg-red-600 animate-pulse';

  const cellBorderClass = "border-r border-gray-300 dark:border-slate-600";

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
          className={`bg-transparent justify-center text-center ${
            !visit?.patient_name 
              ? 'font-normal text-gray-300 dark:text-gray-500' 
              : 'font-black text-slate-800 dark:text-slate-100'
          } ${isDraft ? 'placeholder-gray-300 font-normal' : ''} text-[15px] sm:text-base`}
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
          className="text-slate-700 dark:text-slate-300 font-bold bg-transparent justify-center text-center text-sm sm:text-[15px] xl:text-base"
          onCommit={(val, skipSync, navDir) => {
            let formattedVal = (val || '').replace(/\b\w/g, (c) => c.toUpperCase());
            const upperCaseWords = ['ITB', 'TFL', 'SIJ', 'LS', 'CT', 'TL', 'TMJ', 'ACL', 'MCL', 'ATFL', 'PV', 'AC', 'SC'];
            const pattern = new RegExp(`\\b(${upperCaseWords.join('|')})\\b`, 'gi');
            formattedVal = formattedVal.replace(pattern, (match) => match.toUpperCase());
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
          value={visit?.treatment_name || ''}
          placeholder="처방 입력..." 
          rowStatus={rowStatus}
          onCommitText={handleTreatmentTextCommit}
          onOpenSelector={handleTreatmentSelectorOpen}
          directSelector={isNoBedAssigned || !hasTreatment || isLogEditMode}
          activeStepColor={activeStepColor}
          activeStepIndex={activeStepIndex}
          isLastStep={isLastStep}
          onNextStep={onNextStep}
          onPrevStep={onPrevStep}
          onClearBed={onClearBed}
        />
      </td>

      <td className={`${cellBorderClass} p-0`}>
        <PatientStatusCell 
            gridId={`${rowIndex}-4`}
            rowIndex={rowIndex}
            colIndex={4}
            visit={visit} 
            rowStatus={rowStatus}
            onUpdate={onUpdate || (() => {})} 
            isDraft={isDraft}
            onCreate={onCreate}
        />
      </td>

      <td className={`${cellBorderClass} p-0`}>
        <EditableCell 
          gridId={`${rowIndex}-5`}
          rowIndex={rowIndex}
          colIndex={5}
          value={visit?.memo || ''} 
          placeholder=""
          menuTitle="메모 수정 (로그만 변경)"
          className="text-gray-600 dark:text-gray-400 font-bold bg-transparent justify-center text-center text-sm xl:text-base"
          onCommit={(val, skipSync, navDir) => handleChange('memo', val || '', skipSync, 5, navDir)}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
        />
      </td>

      <td className={`${cellBorderClass} p-0`}>
        <EditableCell 
          gridId={`${rowIndex}-6`}
          rowIndex={rowIndex}
          colIndex={6}
          value={visit?.author || ''} 
          placeholder="-"
          menuTitle="작성자 수정 (로그만 변경)"
          className="text-center justify-center text-gray-400 font-bold bg-transparent text-sm xl:text-base"
          onCommit={(val, skipSync, navDir) => handleChange('author', val || '', skipSync, 6, navDir)}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
        />
      </td>

      <td className="p-0 text-center">
        {!isDraft && visit && onDelete && (
          <div 
            className="flex justify-center items-center h-full outline-none focus:ring-inset focus:ring-2 focus:ring-sky-400"
            tabIndex={0}
            data-grid-id={`${rowIndex}-7`}
            onKeyDown={handleDeleteKeyDown}
          >
            <button 
              onClick={handleDeleteClick}
              className={`
                transition-all duration-200 active:scale-95 flex items-center justify-center
                ${deleteStep === 'idle' 
                  ? 'p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg' 
                  : 'px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold shadow-md hover:bg-red-700 w-[90%]'}
              `}
              title={deleteStep === 'idle' ? "삭제 (클릭하여 확인)" : "삭제 확정"}
              tabIndex={-1} 
            >
              {deleteStep === 'idle' ? (
                <Trash2 className="w-4 h-4 xl:w-5 xl:h-5" />
              ) : (
                "삭제"
              )}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
});
