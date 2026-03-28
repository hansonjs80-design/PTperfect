
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
import { findExactPresetByTreatmentString, generateTreatmentString } from '../utils/bedUtils';

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
  const isApplyingUndoRedoRef = useRef(false);
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
  }, [pushUndoSnapshot]);

  const trackedAddVisit = useCallback(async (initialData: Partial<PatientVisit> = {}): Promise<string> => {
    pushUndoSnapshot();
    return await addVisit(initialData);
  }, [addVisit, pushUndoSnapshot]);

  const trackedDeleteVisit = useCallback(async (visitId: string) => {
    pushUndoSnapshot();
    await deleteVisit(visitId);
  }, [deleteVisit, pushUndoSnapshot]);

  const undoLogOnly = useCallback(async () => {
    if (isApplyingUndoRedoRef.current) return;
    if (undoStackRef.current.length === 0) return;

    const prev = undoStackRef.current.pop();
    if (!prev) return;

    isApplyingUndoRedoRef.current = true;
    try {
      redoStackRef.current.push(cloneVisits(visits));
      setVisits(prev);
      await syncSnapshotToDb(prev);
    } catch (error) {
      console.error('Undo failed:', error);
    } finally {
      isApplyingUndoRedoRef.current = false;
    }
  }, [cloneVisits, setVisits, syncSnapshotToDb, visits]);

  const redoLogOnly = useCallback(async () => {
    if (isApplyingUndoRedoRef.current) return;
    if (redoStackRef.current.length === 0) return;

    const next = redoStackRef.current.pop();
    if (!next) return;

    isApplyingUndoRedoRef.current = true;
    try {
      undoStackRef.current.push(cloneVisits(visits));
      setVisits(next);
      await syncSnapshotToDb(next);
    } catch (error) {
      console.error('Redo failed:', error);
    } finally {
      isApplyingUndoRedoRef.current = false;
    }
  }, [cloneVisits, setVisits, syncSnapshotToDb, visits]);
  const canUndoLog = undoStackRef.current.length > 0;
  const canRedoLog = redoStackRef.current.length > 0;
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMemoHistoryModalOpen, setIsMemoHistoryModalOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PatientVisit[]>([]);
  const [selectedResult, setSelectedResult] = useState<PatientVisit | null>(null);
  const [draftImport, setDraftImport] = useState<Partial<PatientVisit> | null>(null);
  const defaultImportFieldSelection = useMemo(() => ({
    patient_name: true,
    chart_number: true,
    gender: true,
    body_part: true,
    treatment_name: true,
    additional_options: true,
    author: true,
    memo: true,
    special_note: true,
  }), []);
  const [importFieldSelection, setImportFieldSelection] = useState(defaultImportFieldSelection);
  const defaultMemoPasteSelection = useMemo(() => ({
    chart_number: true,
    memo: true,
    special_note: true,
  }), []);
  const [memoPasteSelection, setMemoPasteSelection] = useState(defaultMemoPasteSelection);
  const [selectionAnchor, setSelectionAnchor] = useState<{ row: number | null; col: number | null }>({ row: null, col: null });
  const [selectedVisitIdForImport, setSelectedVisitIdForImport] = useState<string | null>(null);
  // Ref to cancel auto-focus in PatientLogTable when a search shortcut fires
  const cancelAutoFocusRef = useRef<(() => void) | null>(null);
  
  const [selectedMemoTexts, setSelectedMemoTexts] = useState<Set<string>>(new Set());
  const [selectedSpecialNoteTexts, setSelectedSpecialNoteTexts] = useState<Set<string>>(new Set());
  const [combinedMemoPreview, setCombinedMemoPreview] = useState('');
  const [combinedSpecialNotePreview, setCombinedSpecialNotePreview] = useState('');
  
  // Performance Optimization: 
  // Extract status logic to prevent re-rendering on every timer tick.
  const { getRowStatus } = useLogStatusLogic(beds, visits);


  const activeBedIdsInLog = useMemo(() => {
    const ids = new Set<number>();
    visits.forEach((visit) => {
      if (!visit.bed_id) return;
      if (getRowStatus(visit.id, visit.bed_id) !== 'active') return;
      ids.add(visit.bed_id);
    });
    return Array.from(ids);
  }, [visits, getRowStatus]);

  const handleClearAllActiveBeds = useCallback(() => {
    if (activeBedIdsInLog.length === 0) return;

    if (!window.confirm(`현재 활성 침상 ${activeBedIdsInLog.length}개를 모두 비울까요?`)) {
      return;
    }

    activeBedIdsInLog.forEach((bedId) => {
      clearBed(bedId);
    });
  }, [activeBedIdsInLog, clearBed]);

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

    const createdId = await trackedAddVisit(initialData);
    
    // Draft 행에서 텍스트 입력 직후, 단축키나 외부 이벤트로 blur(포커스 잃음)가 발생해 
    // 행이 생성될 때 "가져오기" 대상(selectedVisitIdForImport)도 새로 생성된 행으로 
    // 동기화시켜 주어야 이후의 가져오기 모달에서 중복 생성되는 버그를 막을 수 있습니다.
    setSelectedVisitIdForImport(createdId);

    return createdId;
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
    setImportFieldSelection(defaultImportFieldSelection);
    document.body.removeAttribute('data-prevent-autofocus');
  }, [defaultImportFieldSelection]);

  const resetMemoHistoryModal = useCallback(() => {
    setIsMemoHistoryModalOpen(false);
    document.body.removeAttribute('data-prevent-autofocus');
    setSearchResults([]);
    setSelectedResult(null);
    setDraftImport(null);
    setMemoPasteSelection(defaultMemoPasteSelection);
    setSelectedMemoTexts(new Set());
    setSelectedSpecialNoteTexts(new Set());
    setCombinedMemoPreview('');
    setCombinedSpecialNotePreview('');
  }, [defaultMemoPasteSelection]);

  const mappedResults = useMemo(() => searchResults.slice(0, 5), [searchResults]);

  const normalizeImportedTreatmentName = useCallback((rawTreatmentName: string | null | undefined) => {
    const trimmed = (rawTreatmentName || '').trim();
    if (!trimmed) return '';

    // 1) 세트 문자열과 정확히 일치하면 세트 canonical 문자열로 정규화한다.
    const exactPreset = findExactPresetByTreatmentString(presets, trimmed);
    if (exactPreset) {
      return generateTreatmentString(exactPreset.steps);
    }

    // 2) 과거 데이터가 "세트명 + 처방문자열" 형태일 때, 처방 부분만 추출해 세트 매칭을 시도한다.
    for (const preset of presets) {
      const presetName = (preset.name || '').trim();
      if (!presetName) continue;
      if (!trimmed.startsWith(presetName)) continue;

      const rest = trimmed.slice(presetName.length).trim();
      if (!rest || (!rest.includes('/') && !rest.includes('+'))) continue;

      const restMatch = findExactPresetByTreatmentString(presets, rest);
      if (restMatch) {
        return generateTreatmentString(restMatch.steps);
      }

      return rest;
    }

    return trimmed;
  }, [presets]);
  const sanitizeImportedVisit = useCallback((visit: PatientVisit): Partial<PatientVisit> => {
    const isTimerOnlyVisit = (visit.treatment_name || '').trim() === '타이머';
    return {
      ...visit,
      bed_id: null,
      treatment_name: isTimerOnlyVisit ? '' : normalizeImportedTreatmentName(visit.treatment_name),
    };
  }, [normalizeImportedTreatmentName]);

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
          .or(`patient_name.ilike.%${keyword}%,chart_number.ilike.%${keyword}%`)
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
            const matchName = (v.patient_name || '').toLowerCase().includes(keyword.toLowerCase());
            const matchChart = (v.chart_number || '').toLowerCase().includes(keyword.toLowerCase());
            if ((matchName || matchChart) && v.visit_date < currentDate) {
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

  const selectedKeywordForSearch = useMemo(() => {
    if (selectionAnchor.col === 1) {
      return (selectedVisitForSearch?.chart_number || '').trim();
    }
    if (selectionAnchor.col === 2) {
      return (selectedVisitForSearch?.patient_name || '').trim();
    }
    return (selectedVisitForSearch?.patient_name || selectedVisitForSearch?.chart_number || '').trim();
  }, [selectionAnchor.col, selectedVisitForSearch]);
  
  const targetPatientNameForHistoryPaste = (selectedVisitForSearch?.patient_name || '').trim() || (selectionAnchor.col === 2 ? searchName.trim() : '');

  const memoHistory = useMemo(() => {
    const exactKeyword = selectedKeywordForSearch || searchName.trim();
    if (!exactKeyword) return [] as Array<{ id: string; visitDate: string; memo: string }>;

    const normalized = exactKeyword.toLowerCase();
    const unique = new Set<string>();
    const history: Array<{ id: string; visitDate: string; memo: string }> = [];

    searchResults.forEach((visit) => {
      const visitName = (visit.patient_name || '').trim().toLowerCase();
      const visitChart = (visit.chart_number || '').trim().toLowerCase();
      const memo = (visit.memo || '').trim();
      
      const isMatch = visitName.includes(normalized) || visitChart.includes(normalized);
      if (!isMatch || !memo || unique.has(memo)) return;
      
      unique.add(memo);
      history.push({ id: visit.id, visitDate: visit.visit_date, memo });
    });

    return history;
  }, [searchResults, searchName, selectedKeywordForSearch]);

  const specialNoteHistory = useMemo(() => {
    const exactKeyword = selectedKeywordForSearch || searchName.trim();
    if (!exactKeyword) return [] as Array<{ id: string; visitDate: string; specialNote: string }>;

    const normalized = exactKeyword.toLowerCase();
    const unique = new Set<string>();
    const history: Array<{ id: string; visitDate: string; specialNote: string }> = [];

    searchResults.forEach((visit) => {
      const visitName = (visit.patient_name || '').trim().toLowerCase();
      const visitChart = (visit.chart_number || '').trim().toLowerCase();
      const specialNote = (visit.special_note || '').trim();
      const isMatch = visitName.includes(normalized) || visitChart.includes(normalized);
      if (!isMatch || !specialNote || unique.has(specialNote)) return;
      
      unique.add(specialNote);
      history.push({ id: visit.id, visitDate: visit.visit_date, specialNote });
    });

    return history;
  }, [searchResults, searchName, selectedKeywordForSearch]);
  const visitsRef = useRef(visits);
  const selectedKeywordForSearchRef = useRef(selectedKeywordForSearch);

  useEffect(() => {
    visitsRef.current = visits;
  }, [visits]);

  useEffect(() => {
    selectedKeywordForSearchRef.current = selectedKeywordForSearch;
  }, [selectedKeywordForSearch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isFindShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f';
      const isMemoShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g';
      if (!isFindShortcut && !isMemoShortcut) return;

      e.preventDefault();

      const activeEl = document.activeElement as HTMLElement | null;
      let gridInput = activeEl;
      if (gridInput && gridInput.tagName !== 'INPUT' && gridInput.tagName !== 'TEXTAREA') {
         gridInput = gridInput.querySelector('input') || gridInput;
      }

      const gridId = gridInput?.getAttribute('data-grid-id') || gridInput?.closest('[data-grid-id]')?.getAttribute('data-grid-id');
      const isTableEditing = !!gridId;

      // 브라우저의 IME 조합 중 blur() 호출 시 마지막 문자가 중복되는 현상 방지.
      // 포커스를 일시적으로 유지하고 비동기로 blur와 모달을 열어 이벤트를 끊어줌.
      document.body.setAttribute('data-prevent-autofocus', 'true');

      setTimeout(() => {
        let activeInputValue = '';
        if (gridInput && (gridInput.tagName === 'INPUT' || gridInput.tagName === 'TEXTAREA')) {
          activeInputValue = ((gridInput as HTMLInputElement | HTMLTextAreaElement).value || '').trim();
        }

        if (gridInput && (gridInput.tagName === 'INPUT' || gridInput.tagName === 'TEXTAREA' || gridInput.isContentEditable)) {
          (gridInput as HTMLElement).blur();
        }

        cancelAutoFocusRef.current?.();

        // 동적 DOM에서 현재 셀의 값을 읽어와 STALE Closure 방지
        let keyword = selectedKeywordForSearchRef.current;
        if (isTableEditing && gridId) {
           const [r, c] = gridId.split('-').map(Number);
           const visit = visitsRef.current[r];
           
           // 확실한 가져오기 대상 행 고정을 위해 단축키 발동 시 DOM 기반 위치로 상태 강제 동기화
           setSelectionAnchor({ row: r, col: c });
           if (visit) {
               setSelectedVisitIdForImport(visit.id);
           }

           if (activeInputValue) {
               keyword = activeInputValue;
           } else {
               if (visit) {
                   if (c === 1) keyword = (visit.chart_number || '').trim();
                   else if (c === 2) keyword = (visit.patient_name || '').trim();
                   else keyword = (visit.patient_name || visit.chart_number || '').trim();
               } else {
                   keyword = '';
               }
           }
        }

        requestAnimationFrame(() => {
          if (isMemoShortcut) {
            setIsMemoHistoryModalOpen(true);
          } else {
            setIsSearchModalOpen(true);
          }

          if (keyword) {
            void handleSearchByName(keyword);
          }
        });
      }, 50);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSearchByName]);

  const applyMemoToSelectedRow = useCallback(async (memoText: string): Promise<boolean> => {
    const nextMemo = memoText.trim();
    if (!nextMemo) return false;

    const latestVisits = visitsRef.current;
    const selectedRow = selectionAnchor.row;
    const targetVisitByRow = selectedRow !== null ? latestVisits[selectedRow] : undefined;
    const targetVisitById = selectedVisitIdForImport ? latestVisits.find((v) => v.id === selectedVisitIdForImport) : undefined;
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

  const applyChartNumberToSelectedRow = useCallback(async (chartNumberText: string): Promise<boolean> => {
    const nextChartNumber = chartNumberText.trim();
    if (!nextChartNumber) return false;

    const latestVisits = visitsRef.current;
    const selectedRow = selectionAnchor.row;
    const targetVisitByRow = selectedRow !== null ? latestVisits[selectedRow] : undefined;
    const targetVisitById = selectedVisitIdForImport ? latestVisits.find((v) => v.id === selectedVisitIdForImport) : undefined;
    const targetVisit = targetVisitById || targetVisitByRow;

    if (!targetVisit) {
      if (selectionAnchor.row === null) return false;
      const createdId = await trackedAddVisit({
        bed_id: null,
        patient_name: targetPatientNameForHistoryPaste,
        chart_number: nextChartNumber,
      });
      setSelectedVisitIdForImport(createdId);
      setDraftImport((prev) => ({ ...(prev || {}), patient_name: targetPatientNameForHistoryPaste, chart_number: nextChartNumber }));
      return true;
    }

    const updatePayload: Partial<PatientVisit> = { chart_number: nextChartNumber };
    if (!(targetVisit.patient_name || '').trim() && targetPatientNameForHistoryPaste) {
      updatePayload.patient_name = targetPatientNameForHistoryPaste;
    }
    await trackedUpdateVisitWithBedSync(targetVisit.id, updatePayload, true);
    setDraftImport((prev) => ({ ...(prev || {}), patient_name: updatePayload.patient_name || prev?.patient_name || '', chart_number: nextChartNumber }));
    return true;
  }, [selectionAnchor.row, selectedVisitIdForImport, trackedUpdateVisitWithBedSync, visits, trackedAddVisit, targetPatientNameForHistoryPaste]);

  const applySpecialNoteToSelectedRow = useCallback(async (specialNoteText: string): Promise<boolean> => {
    const nextSpecialNote = specialNoteText.trim();
    if (!nextSpecialNote) return false;

    const latestVisits = visitsRef.current;
    const selectedRow = selectionAnchor.row;
    const targetVisitByRow = selectedRow !== null ? latestVisits[selectedRow] : undefined;
    const targetVisitById = selectedVisitIdForImport ? latestVisits.find((v) => v.id === selectedVisitIdForImport) : undefined;
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

  const applyHistoryBySelection = useCallback(async (historyVisitId: string): Promise<boolean> => {
    if (!memoPasteSelection.memo && !memoPasteSelection.special_note && !memoPasteSelection.chart_number) return false;

    const sourceVisit = searchResults.find((visit) => visit.id === historyVisitId);
    if (!sourceVisit) return false;

    let hasApplied = false;

    if (memoPasteSelection.chart_number) {
      const appliedChart = await applyChartNumberToSelectedRow(sourceVisit.chart_number || '');
      hasApplied = hasApplied || appliedChart;
    }

    if (memoPasteSelection.memo) {
      const appliedMemo = await applyMemoToSelectedRow(sourceVisit.memo || '');
      hasApplied = hasApplied || appliedMemo;
    }

    if (memoPasteSelection.special_note) {
      const appliedSpecial = await applySpecialNoteToSelectedRow(sourceVisit.special_note || '');
      hasApplied = hasApplied || appliedSpecial;
    }

    return hasApplied;
  }, [memoPasteSelection, searchResults, applyChartNumberToSelectedRow, applyMemoToSelectedRow, applySpecialNoteToSelectedRow]);

  const applyCombinedTextsToSelectedRow = useCallback(async (): Promise<boolean> => {
    const hasMemoContent = combinedMemoPreview.trim().length > 0;
    const hasSpecialNoteContent = combinedSpecialNotePreview.trim().length > 0;
    if (!hasMemoContent && !hasSpecialNoteContent) return false;
    
    let hasApplied = false;
    if (memoPasteSelection.chart_number && memoHistory[0]) {
      const sourceVisit = searchResults.find(v => v.id === memoHistory[0].id);
      if (sourceVisit && sourceVisit.chart_number) {
        hasApplied = await applyChartNumberToSelectedRow(sourceVisit.chart_number) || hasApplied;
      }
    }

    if (memoPasteSelection.memo && hasMemoContent) {
      hasApplied = await applyMemoToSelectedRow(combinedMemoPreview.trim()) || hasApplied;
    }

    if (memoPasteSelection.special_note && hasSpecialNoteContent) {
      hasApplied = await applySpecialNoteToSelectedRow(combinedSpecialNotePreview.trim()) || hasApplied;
    }

    return hasApplied;
  }, [combinedMemoPreview, combinedSpecialNotePreview, memoPasteSelection, searchResults, memoHistory, applyChartNumberToSelectedRow, applyMemoToSelectedRow, applySpecialNoteToSelectedRow]);

  const toggleMemoText = useCallback((text: string) => {
    setSelectedMemoTexts(prev => {
      const next = new Set(prev);
      if (next.has(text)) next.delete(text);
      else next.add(text);
      setCombinedMemoPreview(Array.from(next).join('\n'));
      return next;
    });
  }, []);

  const toggleSpecialNoteText = useCallback((text: string) => {
    setSelectedSpecialNoteTexts(prev => {
      const next = new Set(prev);
      if (next.has(text)) next.delete(text);
      else next.add(text);
      setCombinedSpecialNotePreview(Array.from(next).join('\n'));
      return next;
    });
  }, []);

  // Ctrl+F 검색 모달에서 메모/특이사항 체크박스 체크 시 draftImport 필드에 반영
  useEffect(() => {
    if (!isSearchModalOpen) return;
    if (selectedMemoTexts.size > 0) {
      const combined = Array.from(selectedMemoTexts).join('\n');
      setDraftImport(prev => ({ ...(prev || {}), memo: combined }));
    }
  }, [selectedMemoTexts, isSearchModalOpen]);

  useEffect(() => {
    if (!isSearchModalOpen) return;
    if (selectedSpecialNoteTexts.size > 0) {
      const combined = Array.from(selectedSpecialNoteTexts).join('\n');
      setDraftImport(prev => ({ ...(prev || {}), special_note: combined }));
    }
  }, [selectedSpecialNoteTexts, isSearchModalOpen]);

  const selectResult = useCallback((visit: PatientVisit) => {
    setSelectedResult(visit);
    setDraftImport(sanitizeImportedVisit(visit));
  }, [sanitizeImportedVisit]);

  const handleImportToToday = useCallback(async () => {
    if (!draftImport) return;

    const payload: Partial<PatientVisit> = {};

    if (importFieldSelection.patient_name) payload.patient_name = draftImport.patient_name || '';
    if (importFieldSelection.chart_number) payload.chart_number = draftImport.chart_number || '';
    if (importFieldSelection.gender) payload.gender = (draftImport.gender || '').toUpperCase();
    if (importFieldSelection.body_part) payload.body_part = draftImport.body_part || '';
    if (importFieldSelection.treatment_name) {
      payload.treatment_name = normalizeImportedTreatmentName(draftImport.treatment_name);
    }
    if (importFieldSelection.additional_options) {
      payload.is_injection = draftImport.is_injection || false;
      payload.is_fluid = draftImport.is_fluid || false;
      payload.is_traction = draftImport.is_traction || false;
      payload.is_eswt = draftImport.is_eswt || false;
      payload.is_manual = draftImport.is_manual || false;
      payload.is_ion = draftImport.is_ion || false;
      payload.is_exercise = draftImport.is_exercise || false;
      payload.is_injection_completed = draftImport.is_injection_completed || false;
    }
    if (importFieldSelection.author) payload.author = draftImport.author || '';
    if (importFieldSelection.memo) payload.memo = draftImport.memo || '';
    if (importFieldSelection.special_note) payload.special_note = draftImport.special_note || '';

    // visitsRef.current를 사용해 React 상태 지연(Stale Closure) 없이 최신 데이터 참조
    const latestVisits = visitsRef.current;
    const selectedRow = selectionAnchor.row;
    const targetVisitByRow = selectedRow !== null ? latestVisits[selectedRow] : undefined;
    const targetVisitById = selectedVisitIdForImport ? latestVisits.find((v) => v.id === selectedVisitIdForImport) : undefined;
    const targetVisit = targetVisitById || targetVisitByRow;

    if (targetVisit) {
      await trackedUpdateVisitWithBedSync(targetVisit.id, payload, true);
    } else {
      await trackedAddVisit({ bed_id: null, ...payload });
    }

    resetSearchModal();
  }, [trackedAddVisit, draftImport, resetSearchModal, selectedVisitIdForImport, selectionAnchor.row, visits, trackedUpdateVisitWithBedSync, normalizeImportedTreatmentName, importFieldSelection]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
      const isRedo = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'));
      if (!isUndo && !isRedo) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isEditingText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isEditingText) return;

      e.preventDefault();
      e.stopPropagation();
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
            onUndo={() => { void undoLogOnly(); }}
            onRedo={() => { void redoLogOnly(); }}
            canUndo={canUndoLog}
            canRedo={canRedoLog}
            onClearAllBeds={handleClearAllActiveBeds}
            canClearAllBeds={activeBedIdsInLog.length > 0}
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
            if (isSearchModalOpen || isMemoHistoryModalOpen) return;
            setSelectionAnchor({ row, col });
            if (row !== null && visits[row]) {
              setSelectedVisitIdForImport(visits[row].id);
            }
          }}
          cancelAutoFocusRef={cancelAutoFocusRef}
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

      {isSearchModalOpen && (() => {
        const STATUS_LABELS: Record<string, { label: string; color: string }> = {
          is_injection: { label: '주사', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
          is_fluid: { label: '수액', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
          is_traction: { label: '견인', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
          is_eswt: { label: '충격파', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
          is_manual: { label: '도수', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
          is_ion: { label: '이온', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
          is_exercise: { label: '운동', color: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300' },
        };
        const STATUS_KEYS = Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>;

        return (
        <div data-modal-overlay="true" className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3" onClick={resetSearchModal}>
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-slate-700 shrink-0">
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">환자 검색</h3>
              <button onClick={resetSearchModal} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
            </div>

            {/* Search bar */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchByName(); }}
                  placeholder="이름 또는 차트번호 입력..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
                />
                <button onClick={() => { void handleSearchByName(); }} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm">
                  <Search className="w-4 h-4" /> 검색
                </button>
              </div>
              {selectedKeywordForSearch && (
                <p className="text-[11px] text-brand-600 dark:text-brand-400 mt-1.5 font-bold">선택 행 기준 검색: {selectedKeywordForSearch}</p>
              )}
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
              {isSearching && <p className="text-xs text-gray-400 py-4 text-center">검색 중...</p>}
              {!isSearching && mappedResults.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">검색 결과가 없습니다.</p>}

              <div className="space-y-2">
                {mappedResults.map((v) => {
                  const isSelected = selectedResult?.id === v.id;
                  const matchedPreset = v.treatment_name ? findExactPresetByTreatmentString(presets, v.treatment_name.trim()) : null;
                  const treatmentParts = (v.treatment_name || '').split('/').map(s => s.trim()).filter(Boolean);
                  const activeStatuses = STATUS_KEYS.filter(k => v[k as keyof PatientVisit]);

                  return (
                    <button
                      key={v.id}
                      onClick={() => selectResult(v)}
                      className={`w-full text-left rounded-xl border transition-all duration-150 ${isSelected ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-950/30 ring-2 ring-brand-400/50 shadow-md' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm'}`}
                    >
                      {/* Card row: table column order */}
                      <div className="px-3 py-2.5 flex flex-col gap-1.5">
                        {/* Row 1: chart#, name, gender, date */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {v.chart_number && (
                            <span className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">#{v.chart_number}</span>
                          )}
                          <span className="text-[13px] font-extrabold text-gray-900 dark:text-gray-100">{v.patient_name || '(이름없음)'}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${v.gender?.toUpperCase() === 'M' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : v.gender?.toUpperCase() === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>{(v.gender || '-').toUpperCase()}</span>
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 px-1.5 py-0.5 rounded">{v.body_part || '-'}</span>
                          <span className="ml-auto text-[10px] text-gray-400 font-medium">{v.visit_date}</span>
                        </div>

                        {/* Row 2: treatment pills + preset badge */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {matchedPreset && (
                            <span
                              className="text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm border"
                              style={{
                                backgroundColor: matchedPreset.color || '#e0e7ff',
                                color: matchedPreset.textColor || '#3730a3',
                                borderColor: matchedPreset.textColor ? `${matchedPreset.textColor}33` : '#c7d2fe',
                              }}
                            >{matchedPreset.name}</span>
                          )}
                          {treatmentParts.map((part, idx) => (
                            <span key={idx} className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/40">{part}</span>
                          ))}
                          {treatmentParts.length === 0 && <span className="text-[10px] text-gray-400 italic">처방 없음</span>}
                        </div>

                        {/* Row 3: status buttons + author + memo preview */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {activeStatuses.map(k => (
                            <span key={k} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_LABELS[k].color}`}>{STATUS_LABELS[k].label}</span>
                          ))}
                          {v.author && (
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded ml-1">{v.author}</span>
                          )}
                          {v.memo && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[180px] ml-1" title={v.memo}>📝 {v.memo}</span>
                          )}
                          {v.special_note && (
                            <span className="text-[10px] text-orange-500 dark:text-orange-400 truncate max-w-[120px] ml-1" title={v.special_note}>⚠️ {v.special_note}</span>
                          )}
                        </div>
                      </div>

                      {/* Quick import bar */}
                      {isSelected && (
                        <div className="px-3 py-2 border-t border-brand-200 dark:border-brand-800/40 bg-brand-50/40 dark:bg-brand-950/20 rounded-b-xl flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">이 기록을 선택 행에 가져옵니다</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); void handleImportToToday(); }}
                            className="px-3 py-1.5 text-[11px] font-black rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors"
                          >✓ 가져오기</button>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Memo / Special Note History */}
            {(memoHistory.length > 0 || specialNoteHistory.length > 0) && (
              <div className="px-4 py-2.5 border-t border-gray-200 dark:border-slate-700 shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {memoHistory.length > 0 && (
                    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-gray-50 dark:bg-slate-800/40">
                      <p className="text-[11px] font-bold text-gray-500 mb-1">📝 메모 내역</p>
                      <div className="max-h-[100px] overflow-y-auto space-y-1">
                        {memoHistory.map((item) => (
                          <div key={`${item.id}-${item.visitDate}`} className="rounded border border-gray-200 dark:border-slate-700 p-1.5 bg-white dark:bg-slate-900 flex gap-2 items-start">
                            <input type="checkbox" checked={selectedMemoTexts.has(item.memo)} onChange={() => toggleMemoText(item.memo)} className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5" />
                            <div className="flex-1 cursor-pointer min-w-0" onClick={() => toggleMemoText(item.memo)}>
                              <p className="text-[10px] text-gray-400">{item.visitDate}</p>
                              <p className="text-[11px] text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">{item.memo}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {specialNoteHistory.length > 0 && (
                    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-gray-50 dark:bg-slate-800/40">
                      <p className="text-[11px] font-bold text-gray-500 mb-1">⚠️ 특이사항 내역</p>
                      <div className="max-h-[100px] overflow-y-auto space-y-1">
                        {specialNoteHistory.map((item) => (
                          <div key={`${item.id}-${item.visitDate}-special`} className="rounded border border-gray-200 dark:border-slate-700 p-1.5 bg-white dark:bg-slate-900 flex gap-2 items-start">
                            <input type="checkbox" checked={selectedSpecialNoteTexts.has(item.specialNote)} onChange={() => toggleSpecialNoteText(item.specialNote)} className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5" />
                            <div className="flex-1 cursor-pointer min-w-0" onClick={() => toggleSpecialNoteText(item.specialNote)}>
                              <p className="text-[10px] text-gray-400">{item.visitDate}</p>
                              <p className="text-[11px] text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">{item.specialNote}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
              <button onClick={resetSearchModal} className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">닫기</button>
              <button onClick={handleImportToToday} disabled={!draftImport} className="px-4 py-1.5 text-[11px] font-black rounded-lg bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 shadow-sm transition-colors">선택 행에 입력/추가</button>
            </div>
          </div>
        </div>
        );
      })()}

      {isMemoHistoryModalOpen && (
        <div data-modal-overlay="true" className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3" onClick={resetMemoHistoryModal}>
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

              {selectedKeywordForSearch && (
                <p className="text-[11px] text-brand-600 dark:text-brand-400 px-1 font-bold">선택 행 기준 검색: {selectedKeywordForSearch}</p>
              )}

              <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 p-2">
                <p className="text-[11px] font-bold text-gray-500 mb-1">붙여넣기 항목 선택</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-200 select-none">
                    <input
                      type="checkbox"
                      checked={memoPasteSelection.chart_number}
                      onChange={(e) => setMemoPasteSelection((prev) => ({ ...prev, chart_number: e.target.checked }))}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    차트 번호
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-200 select-none">
                    <input
                      type="checkbox"
                      checked={memoPasteSelection.memo}
                      onChange={(e) => setMemoPasteSelection((prev) => ({ ...prev, memo: e.target.checked }))}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    메모
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-200 select-none">
                    <input
                      type="checkbox"
                      checked={memoPasteSelection.special_note}
                      onChange={(e) => setMemoPasteSelection((prev) => ({ ...prev, special_note: e.target.checked }))}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    특이사항
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[280px]">
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 bg-gray-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-bold text-gray-500 mb-2">동일 이름 메모 내역</p>
                  {memoHistory.length === 0 ? (
                    <p className="text-[11px] text-gray-400">검색된 메모 내역이 없습니다.</p>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto space-y-1.5">
                      {memoHistory.map((item) => (
                        <div key={`${item.id}-${item.visitDate}-memo-only`} className="rounded border border-gray-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-900 flex gap-2 items-start">
                          <input 
                            type="checkbox" 
                            checked={selectedMemoTexts.has(item.memo)}
                            onChange={() => toggleMemoText(item.memo)}
                            className="mt-1 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <div className="flex-1 cursor-pointer" onClick={() => toggleMemoText(item.memo)}>
                            <p className="text-[10px] text-gray-500 mb-1">{item.visitDate}</p>
                            <p className="text-[11px] text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{item.memo}</p>
                          </div>
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
                        <div key={`${item.id}-${item.visitDate}-special-only`} className="rounded border border-gray-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-900 flex gap-2 items-start">
                          <input 
                            type="checkbox" 
                            checked={selectedSpecialNoteTexts.has(item.specialNote)}
                            onChange={() => toggleSpecialNoteText(item.specialNote)}
                            className="mt-1 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <div className="flex-1 cursor-pointer" onClick={() => toggleSpecialNoteText(item.specialNote)}>
                            <p className="text-[10px] text-gray-500 mb-1">{item.visitDate}</p>
                            <p className="text-[11px] text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{item.specialNote}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 미리보기 및 편집 영역 */}
              {(selectedMemoTexts.size > 0 || selectedSpecialNoteTexts.size > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-brand-200 dark:border-brand-800 rounded-xl p-3 bg-brand-50/40 dark:bg-brand-950/20">
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] font-bold text-brand-600 dark:text-brand-400">📝 메모 미리보기 (직접 수정 가능)</p>
                    <textarea
                      value={combinedMemoPreview}
                      onChange={(e) => setCombinedMemoPreview(e.target.value)}
                      placeholder="체크한 메모가 여기에 합쳐집니다..."
                      rows={4}
                      className="w-full px-2.5 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400 resize-y"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] font-bold text-brand-600 dark:text-brand-400">📋 특이사항 미리보기 (직접 수정 가능)</p>
                    <textarea
                      value={combinedSpecialNotePreview}
                      onChange={(e) => setCombinedSpecialNotePreview(e.target.value)}
                      placeholder="체크한 특이사항이 여기에 합쳐집니다..."
                      rows={4}
                      className="w-full px-2.5 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400 resize-y"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    const applied = await applyCombinedTextsToSelectedRow();
                    if (applied) resetMemoHistoryModal();
                  }}
                  disabled={selectionAnchor.row === null || (combinedMemoPreview.trim().length === 0 && combinedSpecialNotePreview.trim().length === 0)}
                  className="px-4 py-2 font-bold rounded-lg bg-brand-600 text-white disabled:opacity-40 shadow-sm hover:bg-brand-700 transition-colors"
                >
                  ✅ 선택된 내용 가져오기 ({selectedMemoTexts.size + selectedSpecialNoteTexts.size}개)
                </button>
                <button onClick={resetMemoHistoryModal} className="px-3 py-2 text-xs font-bold rounded bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
