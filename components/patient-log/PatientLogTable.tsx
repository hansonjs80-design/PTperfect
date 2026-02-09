
import React, { memo } from 'react';
import { PatientVisit, BedState, Preset } from '../../types';
import { PatientLogRow } from './PatientLogRow';
import { PatientLogTableHeader } from './PatientLogTableHeader';
import { getRowActiveStatus } from '../../utils/patientLogUtils';

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
  const EMPTY_ROWS_COUNT = 10;
  const activeBedIds = beds.filter(b => b.status !== 'IDLE').map(b => b.id);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-scroll log-scrollbar bg-white dark:bg-slate-900">
      <table className="w-full min-w-[500px] md:min-w-full border-collapse table-fixed">
        <PatientLogTableHeader />
        <tbody>
          {visits.map((visit, index) => {
            const rowStatus = getRowStatus(visit.id, visit.bed_id);
            const bed = visit.bed_id ? beds.find(b => b.id === visit.bed_id) : undefined;
            
            const { 
              activeStepColorClass, 
              activeStepIndex, 
              isLastStep, 
              timerStatus 
            } = getRowActiveStatus(bed, rowStatus, presets);
            
            let handleNextStep: (() => void) | undefined = undefined;
            let handlePrevStep: (() => void) | undefined = undefined;
            let handleClearBed: (() => void) | undefined = undefined;

            if (bed && (rowStatus === 'active' || rowStatus === 'completed')) {
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
                activeStepIndex={activeStepIndex}
                isLastStep={isLastStep}
                timerStatus={timerStatus} 
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onClearBed={handleClearBed}
              />
            );
          })}
          
          {Array.from({ length: EMPTY_ROWS_COUNT }).map((_, index) => (
            <PatientLogRow 
              key={`draft-${index}`}
              rowIndex={visits.length + index}
              isDraft={true}
              onCreate={onCreate}
              onSelectLog={(id) => onSelectLog(id, null)} 
              activeBedIds={activeBedIds}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});
