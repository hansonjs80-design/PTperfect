
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { usePatientLogContext } from '../contexts/PatientLogContext';
import { PatientLogPrintView } from './patient-log/PatientLogPrintView';
import { PatientLogHeader } from './patient-log/PatientLogHeader';
import { PatientLogTable } from './patient-log/PatientLogTable';
import { Loader2, Search, X } from 'lucide-react';
import { useLogStatusLogic } from '../hooks/useLogStatusLogic';
import { BedStatus, PatientVisit } from '../types';
import { isOnlineMode, supabase } from '../lib/supabase';

const PrintPreviewModal = React.lazy(() => import('./modals/PrintPreviewModal').then(module => ({ default: module.PrintPreviewModal })));

interface PatientLogPanelProps {
  onClose?: () => void;
}

export const PatientLogPanel: React.FC<PatientLogPanelProps> = ({ onClose }) => {
  const { 
    setSelectingLogId, 
    setSelectingBedId, 
    beds, 
    presets, 
    nextStep, 
    prevStep, 
    movePatient, 
    updateVisitWithBedSync, 
    setEditingBedId, 
    clearBed,
    isPrintModalOpen,
    setPrintModalOpen
  } = useTreatmentContext();
  
  const { visits, currentDate, setCurrentDate, changeDate, addVisit, deleteVisit } = usePatientLogContext();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PatientVisit[]>([]);
  const [selectedResult, setSelectedResult] = useState<PatientVisit | null>(null);
  const [draftImport, setDraftImport] = useState<Partial<PatientVisit> | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<{ row: number | null; col: number | null }>({ row: null, col: null });
  
  // Performance Optimization: 
  // Extract status logic to prevent re-rendering on every timer tick.
  const { getRowStatus } = useLogStatusLogic(beds, visits);

  const handlePrintClick = () => {
    setPrintModalOpen(true);
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

  // Handle Draft Row Creation with Bed Sync
  // When a draft row assigns a bed_id that's already active, clear the existing bed card first.
  // Note: The confirm popup is shown at the BedSelectorCell level (cursor popup),
  // so by the time this function is called, the user has already confirmed.
  const handleCreateWithBedSync = useCallback(async (initialData: Partial<PatientVisit> = {}): Promise<string> => {
    const targetBedId = initialData.bed_id;

    if (targetBedId) {
      const targetBed = beds.find(b => b.id === targetBedId);
      if (targetBed && targetBed.status === BedStatus.ACTIVE) {
        // Clear the active bed card (sets to IDLE)
        clearBed(targetBedId);
        // Note: Do NOT null out previous visit's bed_id — keep the bed number visible.
        // The row auto-deactivates because getRowStatus checks bed status (IDLE = 'none').
      }
    }

    return await addVisit(initialData);
  }, [beds, addVisit, clearBed]);

  // Handle Deletion with Bed Sync
  const handleDeleteVisit = useCallback((visitId: string) => {
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return;

    const rowStatus = getRowStatus(visitId, visit.bed_id);
    
    // If the row is active (meaning it corresponds to the currently running bed)
    // We still keep the safeguard for active bed clearing
    if (rowStatus === 'active' && visit.bed_id) {
        if (window.confirm(`${visit.bed_id}번 배드가 사용 중입니다. 기록을 삭제하고 배드를 비우시겠습니까?`)) {
            clearBed(visit.bed_id);
            deleteVisit(visitId);
        }
    } else {
        // For normal deletion, we rely on the Row's 2-step button, so we execute immediately here.
        deleteVisit(visitId);
    }
  }, [visits, getRowStatus, clearBed, deleteVisit]);

  const resetSearchModal = useCallback(() => {
    setIsSearchModalOpen(false);
    setSearchName('');
    setSearchResults([]);
    setSelectedResult(null);
    setDraftImport(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isFindShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f';
      if (!isFindShortcut) return;
      e.preventDefault();
      setIsSearchModalOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const mappedResults = useMemo(() => searchResults.slice(0, 5), [searchResults]);
  const sanitizeImportedVisit = useCallback((visit: PatientVisit): Partial<PatientVisit> => {
    const isTimerOnlyVisit = (visit.treatment_name || '').trim() === '타이머';
    return {
      ...visit,
      bed_id: null,
      treatment_name: isTimerOnlyVisit ? '' : (visit.treatment_name || ''),
    };
  }, []);

  const handleSearchByName = useCallback(async () => {
    const keyword = searchName.trim();
    if (!keyword) return;
    setIsSearching(true);

    try {
      if (isOnlineMode() && supabase) {
        const { data } = await supabase
          .from('patient_visits')
          .select('*')
          .ilike('patient_name', `%${keyword}%`)
          .lt('visit_date', currentDate)
          .order('visit_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(30);

        if (data && data.length > 0) {
          setSearchResults(data as PatientVisit[]);
          setSelectedResult(data[0] as PatientVisit);
          setDraftImport(sanitizeImportedVisit(data[0] as PatientVisit));
        } else {
          setSearchResults([]);
          setSelectedResult(null);
          setDraftImport(null);
        }
        return;
      }

      const keys = Object.keys(window.localStorage).filter((k) => k.startsWith('physio-visits-') && k !== `physio-visits-${currentDate}`);
      const merged: PatientVisit[] = [];
      keys.forEach((k) => {
        try {
          const raw = window.localStorage.getItem(k);
          if (!raw) return;
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) return;
          parsed.forEach((v: PatientVisit) => {
            if ((v.patient_name || '').toLowerCase().includes(keyword.toLowerCase()) && v.visit_date < currentDate) {
              merged.push(v);
            }
          });
        } catch {
          // noop
        }
      });
      merged.sort((a, b) => `${b.visit_date} ${b.created_at}`.localeCompare(`${a.visit_date} ${a.created_at}`));
      setSearchResults(merged);
      setSelectedResult(merged[0] || null);
      setDraftImport(merged[0] ? sanitizeImportedVisit(merged[0]) : null);
    } finally {
      setIsSearching(false);
    }
  }, [searchName, currentDate]);

  const selectResult = useCallback((visit: PatientVisit) => {
    setSelectedResult(visit);
    setDraftImport(sanitizeImportedVisit(visit));
  }, [sanitizeImportedVisit]);

  const handleImportToToday = useCallback(async () => {
    if (!draftImport) return;

    const payload: Partial<PatientVisit> = {
      patient_name: draftImport.patient_name || '',
      body_part: draftImport.body_part || '',
      treatment_name: draftImport.treatment_name || '',
      memo: draftImport.memo || '',
      special_note: draftImport.special_note || '',
      is_injection: draftImport.is_injection || false,
      is_fluid: draftImport.is_fluid || false,
      is_traction: draftImport.is_traction || false,
      is_eswt: draftImport.is_eswt || false,
      is_manual: draftImport.is_manual || false,
      is_ion: draftImport.is_ion || false,
      is_injection_completed: draftImport.is_injection_completed || false,
    };

    const selectedRow = selectionAnchor.row;
    const targetVisit = selectedRow !== null ? visits[selectedRow] : undefined;

    if (targetVisit) {
      await updateVisitWithBedSync(targetVisit.id, payload, true);
    } else {
      await addVisit({ bed_id: null, ...payload });
    }

    resetSearchModal();
  }, [addVisit, draftImport, resetSearchModal, selectionAnchor.row, visits, updateVisitWithBedSync]);

  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-xl print:hidden">
        
        {/* Header: Visible on Mobile/Tablet, Hidden on Desktop (xl:hidden) */}
        <div className="xl:hidden shrink-0">
          <PatientLogHeader 
            totalCount={visits.length}
            currentDate={currentDate}
            onDateChange={changeDate}
            onDateSelect={setCurrentDate}
            onPrint={handlePrintClick}
            onClose={onClose}
          />
        </div>

        <PatientLogTable 
          visits={visits}
          beds={beds}
          presets={presets}
          getRowStatus={getRowStatus}
          onUpdate={updateVisitWithBedSync}
          onDelete={handleDeleteVisit}
          onCreate={handleCreateWithBedSync}
          onSelectLog={handleSelectLog}
          onMovePatient={handleMovePatient}
          onEditActive={setEditingBedId}
          onNextStep={nextStep}
          onPrevStep={prevStep}
          onClearBed={clearBed}
          onSelectionAnchorChange={(row, col) => setSelectionAnchor({ row, col })}
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

      {isPrintModalOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        }>
          <PrintPreviewModal 
            isOpen={isPrintModalOpen} 
            onClose={() => setPrintModalOpen(false)} 
            visits={visits} 
            currentDate={currentDate} 
          />
        </Suspense>
      )}

      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3" onClick={resetSearchModal}>
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">이전 날짜 환자 검색 (Ctrl/Cmd + F)</h3>
              <button onClick={resetSearchModal} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchByName(); }}
                  placeholder="이름 입력..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                />
                <button onClick={handleSearchByName} className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold flex items-center gap-1.5">
                  <Search className="w-4 h-4" /> 검색
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[320px]">
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-2 overflow-y-auto">
                  <p className="text-[11px] font-bold text-gray-500 mb-2">최근 일치 기록 (최대 5개)</p>
                  {isSearching && <p className="text-xs text-gray-400 px-2 py-1">검색 중...</p>}
                  {!isSearching && mappedResults.length === 0 && <p className="text-xs text-gray-400 px-2 py-1">검색 결과가 없습니다.</p>}
                  {mappedResults.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => selectResult(v)}
                      className={`w-full text-left px-2 py-2 rounded-lg border mb-1 ${selectedResult?.id === v.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}
                    >
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{v.patient_name || '(이름없음)'}</p>
                      <p className="text-[11px] text-gray-500">{v.visit_date} · {v.body_part || '-'} · {v.treatment_name || '-'}</p>
                    </button>
                  ))}
                </div>

                <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 flex flex-col gap-2">
                  <p className="text-[11px] font-bold text-gray-500">오늘 행으로 가져오기 전 수정</p>
                  <input value={draftImport?.patient_name || ''} onChange={(e) => setDraftImport((p) => ({ ...(p || {}), patient_name: e.target.value }))} placeholder="이름" className="px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                  <input value={draftImport?.body_part || ''} onChange={(e) => setDraftImport((p) => ({ ...(p || {}), body_part: e.target.value }))} placeholder="부위" className="px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                  <input value={draftImport?.treatment_name || ''} onChange={(e) => setDraftImport((p) => ({ ...(p || {}), treatment_name: e.target.value }))} placeholder="치료" className="px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                  <input value={draftImport?.author || ''} onChange={(e) => setDraftImport((p) => ({ ...(p || {}), author: e.target.value }))} placeholder="담당자" className="px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                  <textarea value={draftImport?.memo || ''} onChange={(e) => setDraftImport((p) => ({ ...(p || {}), memo: e.target.value }))} placeholder="메모" rows={4} className="px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                  <input value={draftImport?.special_note || ''} onChange={(e) => setDraftImport((p) => ({ ...(p || {}), special_note: e.target.value }))} placeholder="특이사항" className="px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                  <div className="mt-auto flex justify-end gap-2">
                    <button onClick={resetSearchModal} className="px-3 py-2 text-xs font-bold rounded bg-gray-100 dark:bg-slate-800">취소</button>
                    <button onClick={handleImportToToday} disabled={!draftImport} className="px-3 py-2 text-xs font-bold rounded bg-brand-600 text-white disabled:opacity-50">선택 행에 입력/추가</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
