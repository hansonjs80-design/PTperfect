
import React, { useState, Suspense, useCallback, useMemo } from 'react';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { usePatientLogContext } from '../contexts/PatientLogContext';
import { PatientLogPrintView } from './patient-log/PatientLogPrintView';
import { PatientLogHeader } from './patient-log/PatientLogHeader';
import { PatientLogTable } from './patient-log/PatientLogTable';
import { Loader2 } from 'lucide-react';
import { useLogStatusLogic } from '../hooks/useLogStatusLogic';
import { BedStatus } from '../types';

const PrintPreviewModal = React.lazy(() => import('./modals/PrintPreviewModal').then(module => ({ default: module.PrintPreviewModal })));

interface PatientLogPanelProps {
  onClose?: () => void;
}

export const PatientLogPanel: React.FC<PatientLogPanelProps> = ({ onClose }) => {
  const { setSelectingLogId, setSelectingBedId, beds, presets, nextStep, prevStep, movePatient, updateVisitWithBedSync, setEditingBedId, clearBed } = useTreatmentContext();
  const { visits, currentDate, setCurrentDate, changeDate, addVisit, deleteVisit } = usePatientLogContext();
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Performance Optimization: 
  // Extract status logic to prevent re-rendering on every timer tick.
  const { getRowStatus } = useLogStatusLogic(beds, visits);

  const handlePrintClick = () => {
    setIsPreviewOpen(true);
  };

  const handleMovePatient = useCallback((visitId: string, currentBedId: number, newBedId: number) => {
      movePatient(currentBedId, newBedId);
  }, [movePatient]);

  // Wrapper for selecting log
  const handleSelectLog = useCallback((logId: string, bedId?: number | null) => {
      setSelectingLogId(logId);
      // If bedId is provided (Assignment Mode), set it to trigger Bed Logic.
      // If bedId is null/undefined (Edit Mode), reset it.
      setSelectingBedId(bedId || null);
  }, [setSelectingLogId, setSelectingBedId]);

  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-xl print:hidden">
        
        <PatientLogHeader 
          totalCount={visits.length}
          currentDate={currentDate}
          onDateChange={changeDate}
          onDateSelect={setCurrentDate}
          onPrint={handlePrintClick}
          onClose={onClose}
        />

        <PatientLogTable 
          visits={visits}
          beds={beds}
          presets={presets}
          getRowStatus={getRowStatus}
          onUpdate={updateVisitWithBedSync}
          onDelete={deleteVisit}
          onCreate={addVisit}
          onSelectLog={handleSelectLog}
          onMovePatient={handleMovePatient}
          onEditActive={setEditingBedId}
          onNextStep={nextStep}
          onPrevStep={prevStep}
          onClearBed={clearBed}
        />

        <div className="p-2 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 shrink-0 text-center">
          <p className="text-[10px] text-gray-400">
            * 빈 행에 내용을 입력하면 자동으로 추가됩니다.
          </p>
        </div>
      </div>

      <PatientLogPrintView 
        id="native-print-target" 
        visits={visits} 
        currentDate={currentDate} 
      />

      {isPreviewOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        }>
          <PrintPreviewModal 
            isOpen={isPreviewOpen} 
            onClose={() => setIsPreviewOpen(false)} 
            visits={visits} 
            currentDate={currentDate} 
          />
        </Suspense>
      )}
    </>
  );
};
