
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    setSelectingAppendMode, 
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
  
  const { visits, setVisits, currentDate, setCurrentDate, changeDate, addVisit, deleteVisit } = usePatientLogContext();
  const panelRootRef = useRef<HTMLDivElement>(null);
  const undoStackRef = useRef<PatientVisit[][]>([]);
  const redoStackRef = useRef<PatientVisit[][]>([]);
  const MAX_UNDO_STACK = 250;

  const cloneVisits = useCallback((rows: PatientVisit[]) => rows.map((v) => ({ ...v })), []);

  const syncSnapshotToDb = useCallback(async (snapshot: PatientVisit[]) => {
    if (!isOnlineMode() || !supabase) return;

    const now = new Date().toISOString();
    const rowsToUpsert = snapshot.map((v) => ({ ...v, updated_at: now }));

    if (rowsToUpsert.length > 0) {
      const { error } = await supabase.from('patient_visits').upsert(rowsToUpsert);
      if (error) {
        console.error('Undo DB upsert failed:', error);
      }
    }

    const { data: existingRows, error: selectError } = await supabase
      .from('patient_visits')
      .select('id')
      .eq('visit_date', currentDate);

    if (selectError) {
      console.error('Undo DB read failed:', selectError);
      return;
    }

    const snapshotIds = new Set(snapshot.map((v) => v.id));
    const idsToDelete = (existingRows || [])
      .map((row) => row.id as string)
      .filter((id) => !snapshotIds.has(id));

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase.from('patient_visits').delete().in('id', idsToDelete);
      if (deleteError) {
        console.error('Undo DB delete failed:', deleteError);
      }
    }
  }, [currentDate]);

  const pushUndoSnapshot = useCallback(() => {
    undoStackRef.current.push(cloneVisits(visits));
    if (undoStackRef.current.length > MAX_UNDO_STACK) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, [cloneVisits, visits]);

  const trackedUpdateVisitWithBedSync = useCallback(async (id: string, updates: Partial<PatientVisit>, skipBedSync: boolean = false) => {
    pushUndoSnapshot();
    await updateVisitWithBedSync(id, updates, skipBedSync);
  }, [pushUndoSnapshot, updateVisitWithBedSync]);

  const trackedAddVisit = useCallback(async (initialData: Partial<PatientVisit> = {}): Promise<string> => {
    pushUndoSnapshot();
    return await addVisit(initialData);
  }, [addVisit, pushUndoSnapshot]);

  const trackedDeleteVisit = useCallback(async (visitId: string) => {
    pushUndoSnapshot();
    await deleteVisit(visitId);
  }, [deleteVisit, pushUndoSnapshot]);

  const undoLogOnly = useCallback(async () => {
    if (undoStackRef.current.length === 0) return;

    const prev = undoStackRef.current.pop();
    if (!prev) return;

    redoStackRef.current.push(cloneVisits(visits));
    setVisits(prev);
    await syncSnapshotToDb(prev);
  }, [cloneVisits, setVisits, syncSnapshotToDb, visits]);

  const redoLogOnly = useCallback(async () => {
    if (redoStackRef.current.length === 0) return;

    const next = redoStackRef.current.pop();
    if (!next) return;

    undoStackRef.current.push(cloneVisits(visits));
    setVisits(next);
    await syncSnapshotToDb(next);
  }, [cloneVisits, setVisits, syncSnapshotToDb, visits]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMemoHistoryModalOpen, setIsMemoHistoryModalOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PatientVisit[]>([]);
  const [selectedResult, setSelectedResult] = useState<PatientVisit | null>(null);
  const [draftImport, setDraftImport] = useState<Partial<PatientVisit> | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<{ row: number | null; col: number | null }>({ row: null, col: null });
  const [selectedVisitIdForImport, setSelectedVisitIdForImport] = useState<string | null>(null);
  
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
  const handleSelectLog = useCallback((logId: string, bedId?: number | null, options?: { append?: boolean }) => {
      setSelectingLogId(logId);
      setSelectingAppendMode(!!options?.append);
      // If bedId is provided (Assignment Mode), set it to trigger Bed Logic.
      // If bedId is null/undefined (Edit Mode), reset it.
      setSelectingBedId(bedId || null);
  }, [setSelectingLogId, setSelectingBedId, setSelectingAppendMode]);

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

    return await trackedAddVisit(initialData);
  }, [beds, trackedAddVisit, clearBed]);

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
            void trackedDeleteVisit(visitId);
        }
    } else {
        // For normal deletion, we rely on the Row's 2-step button, so we execute immediately here.
        void trackedDeleteVisit(visitId);
    }
  }, [visits, getRowStatus, clearBed, trackedDeleteVisit]);

  const resetSearchModal = useCallback(() => {
    setIsSearchModalOpen(false);
    setSearchName('');
    setSearchResults([]);
    setSelectedResult(null);
    setDraftImport(null);
  }, []);

  const resetMemoHistoryModal = useCallback(() => {
    setIsMemoHistoryModalOpen(false);
    setSearchName('');
    setSearchResults([]);
    setSelectedResult(null);
    setDraftImport(null);
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

  const handleSearchByName = useCallback(async (keywordOverride?: string) => {
    const keyword = (keywordOverride ?? searchName).trim();
    if (!keyword) return;
    setSearchName(keyword);
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
  }, [searchName, currentDate, sanitizeImportedVisit]);

  const selectedVisitForSearch = useMemo(() => {
    if (selectedVisitIdForImport) {
      return visits.find((visit) => visit.id === selectedVisitIdForImport) || null;
    }
    if (selectionAnchor.row === null) return null;
    return visits[selectionAnchor.row] || null;
  }, [selectedVisitIdForImport, visits, selectionAnchor.row]);

  const selectedPatientNameForSearch = (selectedVisitForSearch?.patient_name || '').trim();
  const targetPatientNameForHistoryPaste = (selectedPatientNameForSearch || searchName.trim()).trim();

  const memoHistory = useMemo(() => {
    const exactName = selectedPatientNameForSearch || searchName.trim();
    if (!exactName) return [] as Array<{ id: string; visitDate: string; memo: string }>;

    const normalized = exactName.toLowerCase();
    const unique = new Set<string>();
    const history: Array<{ id: string; visitDate: string; memo: string }> = [];

    searchResults.forEach((visit) => {
      const visitName = (visit.patient_name || '').trim().toLowerCase();
      const memo = (visit.memo || '').trim();
      if (visitName !== normalized || !memo || unique.has(memo)) return;
      unique.add(memo);
      history.push({ id: visit.id, visitDate: visit.visit_date, memo });
    });

    return history;
  }, [searchResults, searchName, selectedPatientNameForSearch]);

  const specialNoteHistory = useMemo(() => {
    const exactName = selectedPatientNameForSearch || searchName.trim();
    if (!exactName) return [] as Array<{ id: string; visitDate: string; specialNote: string }>;

    const normalized = exactName.toLowerCase();
    const unique = new Set<string>();
    const history: Array<{ id: string; visitDate: string; specialNote: string }> = [];

    searchResults.forEach((visit) => {
      const visitName = (visit.patient_name || '').trim().toLowerCase();
      const specialNote = (visit.special_note || '').trim();
      if (visitName !== normalized || !specialNote || unique.has(specialNote)) return;
      unique.add(specialNote);
      history.push({ id: visit.id, visitDate: visit.visit_date, specialNote });
    });

    return history;
  }, [searchResults, searchName, selectedPatientNameForSearch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isFindShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f';
      const isMemoShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g';
      if (!isFindShortcut && !isMemoShortcut) return;
      e.preventDefault();

      if (isMemoShortcut) {
        setIsMemoHistoryModalOpen(true);
      } else {
        setIsSearchModalOpen(true);
      }

      if (selectedPatientNameForSearch) {
        void handleSearchByName(selectedPatientNameForSearch);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSearchByName, selectedPatientNameForSearch]);

  const applyMemoToSelectedRow = useCallback(async (memoText: string): Promise<boolean> => {
    const nextMemo = memoText.trim();
    if (!nextMemo) return false;

    const selectedRow = selectionAnchor.row;
    const targetVisitByRow = selectedRow !== null ? visits[selectedRow] : undefined;
    const targetVisitById = selectedVisitIdForImport ? visits.find((v) => v.id === selectedVisitIdForImport) : undefined;
    const targetVisit = targetVisitById || targetVisitByRow;

    if (!targetVisit) {
      if (selectionAnchor.row === null) return false;
      const createdId = await trackedAddVisit({
        bed_id: null,
        patient_name: targetPatientNameForHistoryPaste,
        memo: nextMemo,
      });
      setSelectedVisitIdForImport(createdId);
      setDraftImport((prev) => ({ ...(prev || {}), patient_name: targetPatientNameForHistoryPaste, memo: nextMemo }));
      return true;
    }

    const updatePayload: Partial<PatientVisit> = { memo: nextMemo };
    if (!(targetVisit.patient_name || '').trim() && targetPatientNameForHistoryPaste) {
      updatePayload.patient_name = targetPatientNameForHistoryPaste;
    }
    await trackedUpdateVisitWithBedSync(targetVisit.id, updatePayload, true);
    setDraftImport((prev) => ({ ...(prev || {}), patient_name: updatePayload.patient_name || prev?.patient_name || '', memo: nextMemo }));
    return true;
  }, [selectionAnchor.row, selectedVisitIdForImport, trackedUpdateVisitWithBedSync, visits, trackedAddVisit, targetPatientNameForHistoryPaste]);

  const applySpecialNoteToSelectedRow = useCallback(async (specialNoteText: string): Promise<boolean> => {
    const nextSpecialNote = specialNoteText.trim();
    if (!nextSpecialNote) return false;

    const selectedRow = selectionAnchor.row;
    const targetVisitByRow = selectedRow !== null ? visits[selectedRow] : undefined;
    const targetVisitById = selectedVisitIdForImport ? visits.find((v) => v.id === selectedVisitIdForImport) : undefined;
    const targetVisit = targetVisitById || targetVisitByRow;

    if (!targetVisit) {
      if (selectionAnchor.row === null) return false;
      const createdId = await trackedAddVisit({
        bed_id: null,
        patient_name: targetPatientNameForHistoryPaste,
        special_note: nextSpecialNote,
      });
      setSelectedVisitIdForImport(createdId);
      setDraftImport((prev) => ({ ...(prev || {}), patient_name: targetPatientNameForHistoryPaste, special_note: nextSpecialNote }));
      return true;
    }

    const updatePayload: Partial<PatientVisit> = { special_note: nextSpecialNote };
    if (!(targetVisit.patient_name || '').trim() && targetPatientNameForHistoryPaste) {
      updatePayload.patient_name = targetPatientNameForHistoryPaste;
    }
    await trackedUpdateVisitWithBedSync(targetVisit.id, updatePayload, true);
    setDraftImport((prev) => ({ ...(prev || {}), patient_name: updatePayload.patient_name || prev?.patient_name || '', special_note: nextSpecialNote }));
    return true;
  }, [selectionAnchor.row, selectedVisitIdForImport, trackedUpdateVisitWithBedSync, visits, trackedAddVisit, targetPatientNameForHistoryPaste]);

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
      is_exercise: draftImport.is_exercise || false,
      is_injection_completed: draftImport.is_injection_completed || false,
    };

    const selectedRow = selectionAnchor.row;
    const targetVisitByRow = selectedRow !== null ? visits[selectedRow] : undefined;
    const targetVisitById = selectedVisitIdForImport ? visits.find((v) => v.id === selectedVisitIdForImport) : undefined;
    const targetVisit = targetVisitById || targetVisitByRow;

    if (targetVisit) {
      await trackedUpdateVisitWithBedSync(targetVisit.id, payload, true);
    } else {
      await trackedAddVisit({ bed_id: null, ...payload });
    }

    resetSearchModal();
  }, [trackedAddVisit, draftImport, resetSearchModal, selectedVisitIdForImport, selectionAnchor.row, visits, trackedUpdateVisitWithBedSync]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
      const isRedo = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'));
      if (!isUndo && !isRedo) return;

      const target = e.target as HTMLElement | null;
      if (!target || !panelRootRef.current?.contains(target)) return;

      const isEditingText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isEditingText) return;

      e.preventDefault();
      if (isUndo) {
        void undoLogOnly();
      } else {
        void redoLogOnly();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [undoLogOnly, redoLogOnly]);

  return (
    <>
      <div ref={panelRootRef} className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-xl print:hidden">
        
        {/* Header: Visible on all layouts so desktop also shows total/date controls */}
        <div className="shrink-0">
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
          onUpdate={trackedUpdateVisitWithBedSync}
          onDelete={handleDeleteVisit}
          onCreate={handleCreateWithBedSync}
          onSelectLog={handleSelectLog}
          onMovePatient={handleMovePatient}
          onEditActive={setEditingBedId}
          onNextStep={nextStep}
          onPrevStep={prevStep}
          onClearBed={clearBed}
          onSelectionAnchorChange={(row, col) => {
            setSelectionAnchor({ row, col });
            if (row !== null && visits[row]) {
              setSelectedVisitIdForImport(visits[row].id);
            }
          }}
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
                <button onClick={() => { void handleSearchByName(); }} className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold flex items-center gap-1.5">
                  <Search className="w-4 h-4" /> 검색
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[320px]">
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-2 overflow-y-auto">
                  {selectedPatientNameForSearch && (
                    <p className="text-[11px] text-brand-600 dark:text-brand-400 px-2 pb-2 font-bold">선택 행 이름 기준 검색: {selectedPatientNameForSearch}</p>
                  )}
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

                  <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-gray-50 dark:bg-slate-800/40">
                      <p className="text-[11px] font-bold text-gray-500 mb-1">동일 이름 메모 내역</p>
                      {memoHistory.length === 0 ? (
                        <p className="text-[11px] text-gray-400">검색된 메모 내역이 없습니다.</p>
                      ) : (
                        <div className="max-h-[120px] overflow-y-auto space-y-1">
                          {memoHistory.map((item) => (
                            <div key={`${item.id}-${item.visitDate}`} className="rounded border border-gray-200 dark:border-slate-700 p-1.5 bg-white dark:bg-slate-900">
                              <p className="text-[10px] text-gray-500 mb-1">{item.visitDate}</p>
                              <p className="text-[11px] text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{item.memo}</p>
                              <button
                                type="button"
                                onClick={async () => {
                              const applied = await applyMemoToSelectedRow(item.memo);
                              if (applied) resetMemoHistoryModal();
                            }}
                                disabled={selectionAnchor.row === null}
                                className="mt-1 px-2 py-1 text-[10px] font-bold rounded bg-brand-600 text-white disabled:opacity-40"
                              >
                                선택 행 메모 셀에 붙여넣기
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-gray-50 dark:bg-slate-800/40">
                      <p className="text-[11px] font-bold text-gray-500 mb-1">동일 이름 특이사항 내역</p>
                      {specialNoteHistory.length === 0 ? (
                        <p className="text-[11px] text-gray-400">검색된 특이사항 내역이 없습니다.</p>
                      ) : (
                        <div className="max-h-[120px] overflow-y-auto space-y-1">
                          {specialNoteHistory.map((item) => (
                            <div key={`${item.id}-${item.visitDate}-special`} className="rounded border border-gray-200 dark:border-slate-700 p-1.5 bg-white dark:bg-slate-900">
                              <p className="text-[10px] text-gray-500 mb-1">{item.visitDate}</p>
                              <p className="text-[11px] text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{item.specialNote}</p>
                              <button
                                type="button"
                                onClick={async () => {
                              const applied = await applySpecialNoteToSelectedRow(item.specialNote);
                              if (applied) resetMemoHistoryModal();
                            }}
                                disabled={selectionAnchor.row === null}
                                className="mt-1 px-2 py-1 text-[10px] font-bold rounded bg-brand-600 text-white disabled:opacity-40"
                              >
                                선택 행 특이사항 셀에 붙여넣기
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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

      {isMemoHistoryModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3" onClick={resetMemoHistoryModal}>
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">메모/특이사항 이력 (Ctrl/Cmd + G)</h3>
              <button onClick={resetMemoHistoryModal} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
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
                <button onClick={() => { void handleSearchByName(); }} className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold flex items-center gap-1.5">
                  <Search className="w-4 h-4" /> 검색
                </button>
              </div>

              {selectedPatientNameForSearch && (
                <p className="text-[11px] text-brand-600 dark:text-brand-400 px-1 font-bold">선택 행 이름 기준 검색: {selectedPatientNameForSearch}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[280px]">
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 bg-gray-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-bold text-gray-500 mb-2">동일 이름 메모 내역</p>
                  {memoHistory.length === 0 ? (
                    <p className="text-[11px] text-gray-400">검색된 메모 내역이 없습니다.</p>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto space-y-1.5">
                      {memoHistory.map((item) => (
                        <div key={`${item.id}-${item.visitDate}-memo-only`} className="rounded border border-gray-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-900">
                          <p className="text-[10px] text-gray-500 mb-1">{item.visitDate}</p>
                          <p className="text-[11px] text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{item.memo}</p>
                          <button
                            type="button"
                            onClick={async () => {
                              const applied = await applyMemoToSelectedRow(item.memo);
                              if (applied) resetMemoHistoryModal();
                            }}
                            disabled={selectionAnchor.row === null}
                            className="mt-1 px-2 py-1 text-[10px] font-bold rounded bg-brand-600 text-white disabled:opacity-40"
                          >
                            선택 행 메모 셀에 붙여넣기
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 bg-gray-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-bold text-gray-500 mb-2">동일 이름 특이사항 내역</p>
                  {specialNoteHistory.length === 0 ? (
                    <p className="text-[11px] text-gray-400">검색된 특이사항 내역이 없습니다.</p>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto space-y-1.5">
                      {specialNoteHistory.map((item) => (
                        <div key={`${item.id}-${item.visitDate}-special-only`} className="rounded border border-gray-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-900">
                          <p className="text-[10px] text-gray-500 mb-1">{item.visitDate}</p>
                          <p className="text-[11px] text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{item.specialNote}</p>
                          <button
                            type="button"
                            onClick={async () => {
                              const applied = await applySpecialNoteToSelectedRow(item.specialNote);
                              if (applied) resetMemoHistoryModal();
                            }}
                            disabled={selectionAnchor.row === null}
                            className="mt-1 px-2 py-1 text-[10px] font-bold rounded bg-brand-600 text-white disabled:opacity-40"
                          >
                            선택 행 특이사항 셀에 붙여넣기
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={resetMemoHistoryModal} className="px-3 py-2 text-xs font-bold rounded bg-gray-100 dark:bg-slate-800">닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
