
import React, { memo } from 'react';
import { PatientVisit, BedState, Preset } from '../../types';
import { PatientLogRow } from './PatientLogRow';
import { PatientLogTableHeader } from './PatientLogTableHeader';
import { mapBgToTextClass } from '../../utils/styleUtils';

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
  // 항상 10개의 빈 행을 유지하여 연속 입력 편의성 제공
  const EMPTY_ROWS_COUNT = 10;

  // Active Bed Ids for grid selection highlight
  const activeBedIds = beds.filter(b => b.status !== 'IDLE').map(b => b.id);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar bg-white dark:bg-slate-900">
      {/* 
        Mobile Optimization: 
        min-w-[500px] ensures the table is wider than the screen in portrait mode but compact enough.
        triggering horizontal scroll and allowing columns (like Treatment List) to be wider.
        md:min-w-full reverts to fitting the container on larger screens.
      */}
      <table className="w-full min-w-[500px] md:min-w-full border-collapse table-fixed">
        <PatientLogTableHeader />
        {/* Updated: Remove heavy divides for cleaner look */}
        <tbody>
          {visits.map((visit) => {
            const rowStatus = getRowStatus(visit.id, visit.bed_id);
            
            // --- Active Step Logic ---
            let activeStepColorClass: string | undefined = undefined;
            let activeStepIndex: number = -1;
            let isLastStep = false;
            let timerStatus: 'normal' | 'warning' | 'overtime' = 'normal'; 
            
            let handleNextStep: (() => void) | undefined = undefined;
            let handlePrevStep: (() => void) | undefined = undefined;
            let handleClearBed: (() => void) | undefined = undefined;

            if ((rowStatus === 'active' || rowStatus === 'completed') && visit.bed_id) {
               const bed = beds.find(b => b.id === visit.bed_id);
               if (bed) {
                  if (bed.status === 'ACTIVE' && !bed.isPaused) {
                      const currentPreset = bed.customPreset || presets.find(p => p.id === bed.currentPresetId);
                      const currentStepInfo = currentPreset?.steps[bed.currentStepIndex];
                      
                      if (currentStepInfo?.enableTimer) {
                          if (bed.remainingTime <= 0) {
                              timerStatus = 'overtime';
                          } else if (bed.remainingTime < 60) {
                              timerStatus = 'warning';
                          }
                      }
                  }

                  const preset = bed.customPreset || presets.find(p => p.id === bed.currentPresetId);
                  const totalSteps = preset?.steps.length || 0;
                  
                  isLastStep = bed.currentStepIndex === totalSteps - 1;

                  const step = preset?.steps[bed.currentStepIndex];
                  
                  if (step || rowStatus === 'completed') {
                     if (step) {
                        activeStepColorClass = mapBgToTextClass(step.color);
                        activeStepIndex = bed.currentStepIndex;
                     }
                     
                     if (onNextStep) handleNextStep = () => onNextStep(bed.id);
                     if (onPrevStep) handlePrevStep = () => onPrevStep(bed.id);
                     if (onClearBed) handleClearBed = () => onClearBed(bed.id);
                  }
               }
            }

            return (
              <PatientLogRow 
                key={visit.id}
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
