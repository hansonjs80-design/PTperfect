
import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
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
  // Updated signature to accept navigation intent
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

  const handleAssign = async (newBedId: number) => {
    if (isDraft && onCreate) {
       await onCreate({ bed_id: newBedId }, 0); 
    } else if (!isDraft && visit && onUpdate) {
       onUpdate(visit.id, { bed_id: newBedId });
    }
  };

  const handleMove = (newBedId: number) => {
    if (!isDraft && visit && visit.bed_id && onMovePatient) {
        onMovePatient(visit.id, visit.bed_id, newBedId);
    }
  };

  const handleUpdateLogOnly = (newBedId: number) => {
      if (!isDraft && visit && onUpdate) {
          onUpdate(visit.id, { bed_id: newBedId }, true);
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

  const handleDeleteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isDraft && visit && onDelete) {
        onDelete(visit.id);
      }
    } else {
      handleGridKeyDown(e, rowIndex, 7);
    }
  };

  let rowClasses = 'group transition-all border-b border-gray-300 dark:border-slate-600 h-[36px] '; 
  
  if (rowStatus === 'active') {
    rowClasses += 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20';
  } else if (rowStatus === 'completed') {
    rowClasses += 'bg-slate-50 dark:bg-slate-800/50 opacity-80 hover:opacity-100';
  } else {
    rowClasses += 'bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/80';
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
      {/* 1. Bed ID */}
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

      {/* 2. Patient Name: Increased font size (text-sm -> text-base) */}
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
          suppressEnterNav={isDraft} // Enable suppression for Draft rows
        />
      </td>

      {/* 3. Body Part: Increased font size (text-xs -> text-sm) */}
      <td className={`${cellBorderClass} p-0`}>
        <EditableCell 
          gridId={`${rowIndex}-2`}
          rowIndex={rowIndex}
          colIndex={2}
          value={visit?.body_part || ''} 
          placeholder=""
          menuTitle="치료 부위 수정 (로그만 변경)"
          className="text-slate-700 dark:text-slate-300 font-bold bg-transparent justify-center text-center text-sm sm:text-[15px]"
          onCommit={(val, skipSync, navDir) => handleChange('body_part', val || '', skipSync, 2, navDir)}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
        />
      </td>

      {/* 4. Treatment */}
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

      {/* 5. Status */}
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

      {/* 6. Memo: Increased font size (text-xs -> text-sm) */}
      <td className={`${cellBorderClass} p-0`}>
        <EditableCell 
          gridId={`${rowIndex}-5`}
          rowIndex={rowIndex}
          colIndex={5}
          value={visit?.memo || ''} 
          placeholder=""
          menuTitle="메모 수정 (로그만 변경)"
          className="text-gray-600 dark:text-gray-400 font-bold bg-transparent justify-center text-center text-sm"
          onCommit={(val, skipSync, navDir) => handleChange('memo', val || '', skipSync, 5, navDir)}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
        />
      </td>

      {/* 7. Author: Increased font size (text-xs -> text-sm) */}
      <td className={`${cellBorderClass} p-0`}>
        <EditableCell 
          gridId={`${rowIndex}-6`}
          rowIndex={rowIndex}
          colIndex={6}
          value={visit?.author || ''} 
          placeholder="-"
          menuTitle="작성자 수정 (로그만 변경)"
          className="text-center justify-center text-gray-400 font-bold bg-transparent text-sm"
          onCommit={(val, skipSync, navDir) => handleChange('author', val || '', skipSync, 6, navDir)}
          directEdit={true}
          syncOnDirectEdit={false}
          suppressEnterNav={isDraft}
        />
      </td>

      {/* 8. Delete */}
      <td className="p-0 text-center">
        {!isDraft && visit && onDelete && (
          <div 
            className="flex justify-center items-center h-full outline-none focus:bg-red-50 dark:focus:bg-red-900/20 focus:ring-inset focus:ring-2 focus:ring-sky-400"
            tabIndex={0}
            data-grid-id={`${rowIndex}-7`}
            onKeyDown={handleDeleteKeyDown}
          >
            <button 
              onClick={() => onDelete(visit.id)}
              className="p-1.5 text-gray-300 hover:text-red-500 transition-all active:scale-90 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              title="삭제"
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
