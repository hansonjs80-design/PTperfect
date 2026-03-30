import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { usePatientLogContext } from '../contexts/PatientLogContext';
import { PatientLogPrintView } from './patient-log/PatientLogPrintView';
import { PatientLogHeader } from './patient-log/PatientLogHeader';
import { PatientLogTable } from './patient-log/PatientLogTable';
import { Loader2, Search, X, Edit3 } from 'lucide-react';
import { useLogStatusLogic } from '../hooks/useLogStatusLogic';
import { BedStatus, PatientVisit, TreatmentStep, QuickTreatment } from '../types';
import { isOnlineMode, supabase } from '../lib/supabase';
import { findExactPresetByTreatmentString, generateTreatmentString, parseTreatmentString } from '../utils/bedUtils';
import { useLocalStorage } from '../hooks/useLocalStorage';

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
    setPrintModalOpen,
    quickTreatments
  } = useTreatmentContext();
  
  const { visits, setVisits, currentDate, setCurrentDate, changeDate, addVisit, deleteVisit } = usePatientLogContext();
  const panelRootRef = useRef<HTMLDivElement>(null);
  const isApplyingUndoRedoRef = useRef(false);
  const undoStackRef = useRef<PatientVisit[][]>([]);
  const redoStackRef = useRef<PatientVisit[][]>([]);
  const MAX_UNDO_STACK = 250;
  const [authorOptions] = useLocalStorage<string[]>('physio-author-options', ['S', 'K', 'J']);

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
  const [pendingSearchInput, setPendingSearchInput] = useState<{col: number, text: string} | null>(null);
  const [draftRowKey, setDraftRowKey] = useState(0);
  const [searchName, setSearchName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PatientVisit[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [draftImport, setDraftImport] = useState<Partial<PatientVisit> | null>(null);
  const defaultImportFieldSelection = useMemo(() => ({
    patient_name: true,
    chart_number: true,
    gender: true,
    body_part: true,
    treatment_name: true,
    additional_options: true,
    author: false,
    memo: true,
    special_note: true,
  }), []);
  const [importFieldSelection, setImportFieldSelection] = useState(defaultImportFieldSelection);
  const [modalEdits, setModalEdits] = useState<Record<string, Partial<PatientVisit>>>({});

  const handleModalLocalUpdate = useCallback((id: string, updates: Partial<PatientVisit>) => {
    setModalEdits(prev => {
      const existing = prev[id] || {};
      return { ...prev, [id]: { ...existing, ...updates } };
    });
  }, []);

  const replaceStepAt = (steps: TreatmentStep[], idx: number, qt: QuickTreatment): TreatmentStep[] => {
    const next = [...steps];
    next[idx] = {
      ...next[idx],
      id: next[idx]?.id || crypto.randomUUID(),
      name: qt.name,
      label: qt.label,
      duration: Math.max(1, Math.round(qt.duration * 60)),
      enableTimer: qt.enableTimer,
      color: qt.color,
    };
    return next;
  };

  const appendStepAtEnd = (steps: TreatmentStep[], qt: QuickTreatment): TreatmentStep[] => {
    const nextStep: TreatmentStep = {
      id: crypto.randomUUID(),
      name: qt.name,
      label: qt.label,
      duration: Math.max(1, Math.round(qt.duration * 60)),
      enableTimer: qt.enableTimer,
      color: qt.color,
    };
    return [...steps, nextStep];
  };

  const moveStepLocal = (steps: TreatmentStep[], idx: number, direction: 'left' | 'right'): TreatmentStep[] => {
    const target = direction === 'left' ? idx - 1 : idx + 1;
    if (target < 0 || target >= steps.length) return steps;
    const next = [...steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    return next;
  };

  const removeStepAt = (steps: TreatmentStep[], idx: number): TreatmentStep[] => {
    if (idx < 0 || idx >= steps.length) return steps;
    return steps.filter((_, i) => i !== idx);
  };

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
    setSelectedResultId(null);
    setDraftImport(null);
    setImportFieldSelection(defaultImportFieldSelection);
    setPendingSearchInput(null);
    setDraftRowKey(prev => prev + 1);
    setModalEdits({});
    document.body.removeAttribute('data-prevent-autofocus');
  }, [defaultImportFieldSelection]);

  const resetMemoHistoryModal = useCallback(() => {
    setIsMemoHistoryModalOpen(false);
    document.body.removeAttribute('data-prevent-autofocus');
    setSearchResults([]);
    setSelectedResultId(null);
    setDraftImport(null);
    setMemoPasteSelection(defaultMemoPasteSelection);
    setSelectedMemoTexts(new Set());
    setSelectedSpecialNoteTexts(new Set());
    setCombinedMemoPreview('');
    setCombinedSpecialNotePreview('');
  }, [defaultMemoPasteSelection]);

  const mappedResults = useMemo(() => searchResults.slice(0, 10).map(v => {
    const localOverride = modalEdits[v.id];
    const merged = localOverride ? { ...v, ...localOverride } : v;
    const treatmentValue = merged.treatment_name || '';

    return {
      ...merged,
      matchedPreset: treatmentValue ? findExactPresetByTreatmentString(presets, treatmentValue.trim(), quickTreatments) : null,
      treatmentParts: treatmentValue.split('/').map((s) => s.trim()).filter(Boolean),
      activeStatuses: [
        merged.is_injection ? 'is_injection' : null,
        merged.is_fluid ? 'is_fluid' : null,
        merged.is_manual ? 'is_manual' : null,
        merged.is_eswt ? 'is_eswt' : null,
        merged.is_traction ? 'is_traction' : null,
        merged.is_ion ? 'is_ion' : null,
        merged.is_exercise ? 'is_exercise' : null,
      ].filter(Boolean) as string[],
    };
  }), [searchResults, modalEdits, presets, quickTreatments]);

  const selectedResult = useMemo(
    () => mappedResults.find((result) => result.id === selectedResultId) || null,
    [mappedResults, selectedResultId]
  );

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
          .or(`patient_name.ilike.%${keyword}%,chart_number.eq.${keyword}`)
          .lt('visit_date', currentDate)
          .order('visit_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        if (data && data.length > 0) {
          setSearchResults(data as PatientVisit[]);
          setSelectedResultId((data[0] as PatientVisit).id);
          setDraftImport(sanitizeImportedVisit(data[0] as PatientVisit));
        } else {
          setSearchResults([]);
          setSelectedResultId(null);
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
            const matchChart = (v.chart_number || '').trim().toLowerCase() === keyword.toLowerCase();
            if ((matchName || matchChart) && v.visit_date < currentDate) {
              merged.push(v);
            }
          });
        } catch {
          // noop
        }
      });
      merged.sort((a, b) => `${b.visit_date} ${b.created_at}`.localeCompare(`${a.visit_date} ${a.created_at}`));
      const limited = merged.slice(0, 10);
      setSearchResults(limited);
      setSelectedResultId(limited[0]?.id || null);
      setDraftImport(limited[0] ? sanitizeImportedVisit(limited[0]) : null);
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
      
      const isMatch = visitName.includes(normalized) || visitChart === normalized;
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
      const isMatch = visitName.includes(normalized) || visitChart === normalized;
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
               setPendingSearchInput({ col: c, text: activeInputValue });
           } else {
               if (visit) {
                   if (c === 1) keyword = (visit.chart_number || '').trim();
                   else if (c === 2) keyword = (visit.patient_name || '').trim();
                   else keyword = (visit.patient_name || visit.chart_number || '').trim();
               } else {
                   keyword = '';
               }
               setPendingSearchInput(null);
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
    const localOverride = modalEdits[visit.id];
    const merged = localOverride ? { ...visit, ...localOverride } : visit;
    setSelectedResultId(visit.id);
    setDraftImport(sanitizeImportedVisit(merged));
  }, [sanitizeImportedVisit, modalEdits]);

  const handleImportToToday = useCallback(async () => {
    if (!selectedResult) return;

    // Merge originalResult with any local edits made in the modal
    const localOverride = modalEdits[selectedResult.id] || {};
    const source = { ...selectedResult, ...localOverride };
    const sanitized = sanitizeImportedVisit(source);

    const payload: Partial<PatientVisit> = {};

    if (importFieldSelection.patient_name) payload.patient_name = sanitized.patient_name || '';
    if (importFieldSelection.chart_number) payload.chart_number = sanitized.chart_number || '';
    if (importFieldSelection.gender) payload.gender = (sanitized.gender || '').toUpperCase();
    if (importFieldSelection.body_part) payload.body_part = sanitized.body_part || '';
    if (importFieldSelection.treatment_name) {
      payload.treatment_name = normalizeImportedTreatmentName(sanitized.treatment_name);
    }
    if (importFieldSelection.additional_options) {
      payload.is_injection = sanitized.is_injection || false;
      payload.is_fluid = sanitized.is_fluid || false;
      payload.is_traction = sanitized.is_traction || false;
      payload.is_eswt = sanitized.is_eswt || false;
      payload.is_manual = sanitized.is_manual || false;
      payload.is_ion = sanitized.is_ion || false;
      payload.is_exercise = sanitized.is_exercise || false;
      payload.is_injection_completed = sanitized.is_injection_completed || false;
    }
    if (importFieldSelection.author) payload.author = sanitized.author || '';
    if (importFieldSelection.memo) payload.memo = sanitized.memo || '';
    if (importFieldSelection.special_note) payload.special_note = sanitized.special_note || '';

    // 모달을 열기 직전 타이핑 중이던 값(pendingSearchInput) 복원
    if (pendingSearchInput) {
      if (pendingSearchInput.col === 1 && !importFieldSelection.chart_number) {
        payload.chart_number = pendingSearchInput.text;
      } else if (pendingSearchInput.col === 2 && !importFieldSelection.patient_name) {
        payload.patient_name = pendingSearchInput.text;
      }
    }

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
  }, [trackedAddVisit, selectedResult, modalEdits, sanitizeImportedVisit, resetSearchModal, selectedVisitIdForImport, selectionAnchor.row, visits, trackedUpdateVisitWithBedSync, normalizeImportedTreatmentName, importFieldSelection, pendingSearchInput]);

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
        const rowGridClass = "grid grid-cols-[72px_72px_70px_62px_50px_minmax(160px,1fr)_120px_60px_110px_110px] min-w-[880px]";

        return (
        <div data-modal-overlay="true" className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3" onClick={resetSearchModal}>
          <div className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl max-h-[95vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 shrink-0">
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-100 flex items-center gap-2"><Search className="w-4 h-4 text-brand-500" /> 환자 검색 (표 뷰)</h3>
              <button onClick={resetSearchModal} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Search bar */}
            <div className="px-4 pt-3 pb-3 shrink-0 border-b border-gray-100 dark:border-slate-800">
              <div className="flex gap-2 max-w-2xl">
                <input
                  autoFocus
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchByName(); }}
                  placeholder="이름 또는 차트번호 입력..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
                />
                <button onClick={() => { void handleSearchByName(); }} className="px-5 py-2 rounded-lg bg-gray-800 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm">
                  검색
                </button>
              </div>
              {selectedKeywordForSearch && (
                <p className="text-[11px] text-brand-600 dark:text-brand-400 mt-1.5 font-bold ml-1">선택 행 기준 검색: {selectedKeywordForSearch}</p>
              )}
            </div>


            {/* Results list (Table View) with Header Checkboxes */}
            <div className="flex-1 overflow-x-auto overflow-y-auto px-4 py-3 min-h-[250px] bg-slate-50 dark:bg-slate-900/50">
              {isSearching && <p className="text-xs text-gray-400 py-8 text-center animate-pulse">데이터를 찾고 있습니다...</p>}
              {!isSearching && mappedResults.length === 0 && <p className="text-xs text-gray-400 py-8 text-center">검색 결과가 없습니다.</p>}

              {!isSearching && mappedResults.length > 0 && (
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                  {/* Table Header with Checkboxes */}
                  <div className={`${rowGridClass} bg-gray-100 dark:bg-slate-700/50 border-b-2 border-gray-300 dark:border-slate-600 text-[10px] font-bold text-gray-600 dark:text-gray-300 select-none`}>
                    <div className="px-2 py-2 text-center border-r border-gray-200 dark:border-slate-700">날짜</div>
                    <div className="px-1 py-1.5 flex items-center justify-center gap-1 border-r border-gray-200 dark:border-slate-700">
                      <input type="checkbox" checked={importFieldSelection.chart_number} onChange={e => setImportFieldSelection(p => ({...p, chart_number: e.target.checked}))} className="rounded border-gray-400 w-3 h-3 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                      <span>차트 번호</span>
                    </div>
                    <div className="px-1 py-1.5 flex items-center justify-center gap-1 border-r border-gray-200 dark:border-slate-700">
                      <input type="checkbox" checked={importFieldSelection.patient_name} onChange={e => setImportFieldSelection(p => ({...p, patient_name: e.target.checked}))} className="rounded border-gray-400 w-3 h-3 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                      <span>이름</span>
                    </div>
                    <div className="px-1 py-1.5 flex items-center justify-center gap-1 border-r border-gray-200 dark:border-slate-700">
                      <input type="checkbox" checked={importFieldSelection.gender} onChange={e => setImportFieldSelection(p => ({...p, gender: e.target.checked}))} className="rounded border-gray-400 w-3 h-3 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                      <span>성별</span>
                    </div>
                    <div className="px-1 py-1.5 flex items-center justify-center gap-1 border-r border-gray-200 dark:border-slate-700">
                      <input type="checkbox" checked={importFieldSelection.body_part} onChange={e => setImportFieldSelection(p => ({...p, body_part: e.target.checked}))} className="rounded border-gray-400 w-3 h-3 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                      <span>부위</span>
                    </div>
                    <div className="px-1 py-1.5 flex items-center justify-center gap-1 border-r border-gray-200 dark:border-slate-700">
                      <input type="checkbox" checked={importFieldSelection.treatment_name} onChange={e => setImportFieldSelection(p => ({...p, treatment_name: e.target.checked}))} className="rounded border-gray-400 w-3 h-3 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                      <span>처방목록</span>
                    </div>
                    <div className="px-1 py-1.5 flex items-center justify-center gap-1 border-r border-gray-200 dark:border-slate-700" title="주사, 수액, 견인, 체외충격, 도수, 이온, 운동치료">
                      <input type="checkbox" checked={importFieldSelection.additional_options} onChange={e => setImportFieldSelection(p => ({...p, additional_options: e.target.checked}))} className="rounded border-gray-400 w-3 h-3 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                      <span>추가사항</span>
                    </div>
                    <div className="px-1 py-1.5 flex items-center justify-center gap-1 border-r border-gray-200 dark:border-slate-700">
                      <input type="checkbox" checked={importFieldSelection.author} onChange={e => setImportFieldSelection(p => ({...p, author: e.target.checked}))} className="rounded border-gray-400 w-3 h-3 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                      <span>담당</span>
                    </div>
                    <div className="px-1 py-1.5 flex items-center justify-center gap-1 border-r border-gray-200 dark:border-slate-700">
                      <input type="checkbox" checked={importFieldSelection.memo} onChange={e => setImportFieldSelection(p => ({...p, memo: e.target.checked}))} className="rounded border-gray-400 w-3 h-3 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                      <span>메모</span>
                    </div>
                    <div className="px-1 py-1.5 flex items-center justify-center gap-1">
                      <input type="checkbox" checked={importFieldSelection.special_note} onChange={e => setImportFieldSelection(p => ({...p, special_note: e.target.checked}))} className="rounded border-gray-400 w-3 h-3 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                      <span>특이</span>
                    </div>
                  </div>
                  
                  {/* Table Body - Simple Inline Editable */}
                  <div className="flex flex-col">
                    {mappedResults.map((v, ridx) => {
                      const isSelected = selectedResult?.id === v.id;
                      const treatmentValue = v.treatment_name || '';
                      const matchedPreset = treatmentValue ? findExactPresetByTreatmentString(presets, treatmentValue.trim(), quickTreatments) : null;
                      const treatmentParts = treatmentValue.split('/').map(s => s.trim()).filter(Boolean);
                      const STATUS_PILL_MAP: Record<string, { label: string; bg: string }> = {
                        is_injection: { label: '주사', bg: 'bg-red-500' },
                        is_fluid: { label: '수액', bg: 'bg-cyan-500' },
                        is_manual: { label: '도수', bg: 'bg-violet-500' },
                        is_eswt: { label: '충격파', bg: 'bg-blue-500' },
                        is_traction: { label: '견인', bg: 'bg-orange-500' },
                        is_ion: { label: '이온', bg: 'bg-emerald-500' },
                        is_exercise: { label: '운동', bg: 'bg-lime-500' },
                      };
                      const activeStatuses = Object.keys(STATUS_PILL_MAP).filter(k => v[k as keyof PatientVisit]);

                      return (
                        <div
                          key={v.id}
                          onClick={() => selectResult(v)}
                          className={`${rowGridClass} border-b border-gray-100 dark:border-slate-700/50 last:border-0 cursor-pointer transition-colors hover:bg-brand-50/50 dark:hover:bg-brand-900/10 ${isSelected ? 'bg-brand-50 dark:bg-brand-900/40 ring-1 ring-inset ring-brand-400 dark:ring-brand-600' : ''}`}
                        >
                          {/* 날짜 (Read Only) */}
                          <div className="px-2 py-2 flex items-center justify-center text-[11px] font-medium text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-slate-700/50">
                            {v.visit_date.slice(2)}
                          </div>
                          
                          {/* 차트번호 */}
                          <div className="border-r border-gray-100 dark:border-slate-700/50 p-0" onClick={e => e.stopPropagation()}>
                            <input
                              className="w-full h-full min-h-[36px] px-1.5 text-[11px] font-mono font-bold text-center bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:bg-brand-50 dark:focus:bg-brand-900/30 focus:shadow-[inset_0_0_0_1px_rgb(96_165_250)] transition-colors"
                              defaultValue={v.chart_number || ''}
                              placeholder="-"
                              onBlur={e => {
                                const val = e.target.value;
                                if (val !== (v.chart_number || '')) handleModalLocalUpdate(v.id, { chart_number: val });
                              }}
                            />
                          </div>
                          
                          {/* 이름 */}
                          <div className="border-r border-gray-100 dark:border-slate-700/50 p-0" onClick={e => e.stopPropagation()}>
                            <input
                              className="w-full h-full min-h-[36px] px-1.5 text-[12px] font-extrabold text-center bg-transparent text-gray-900 dark:text-gray-100 outline-none focus:bg-brand-50 dark:focus:bg-brand-900/30 focus:shadow-[inset_0_0_0_1px_rgb(96_165_250)] transition-colors"
                              defaultValue={v.patient_name || ''}
                              placeholder="-"
                              onBlur={e => {
                                const val = e.target.value;
                                if (val !== (v.patient_name || '')) handleModalLocalUpdate(v.id, { patient_name: val });
                              }}
                            />
                          </div>
                          
                          {/* 성별 */}
                          <div className="border-r border-gray-100 dark:border-slate-700/50 p-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                            <select
                              className="w-full h-full min-h-[36px] text-[10px] font-bold text-center bg-transparent outline-none cursor-pointer focus:shadow-[inset_0_0_0_1px_rgb(96_165_250)]"
                              value={(v.gender || '').toUpperCase()}
                              onChange={e => handleModalLocalUpdate(v.id, { gender: e.target.value })}
                            >
                              <option value="">-</option>
                              <option value="M">M</option>
                              <option value="F">F</option>
                            </select>
                          </div>

                          {/* 부위 */}
                          <div className="border-r border-gray-100 dark:border-slate-700/50 p-0" onClick={e => e.stopPropagation()}>
                            <input
                              className="w-full h-full min-h-[36px] px-1 text-[11px] font-medium text-center bg-transparent text-amber-700 dark:text-amber-400 outline-none focus:bg-brand-50 dark:focus:bg-brand-900/30 focus:shadow-[inset_0_0_0_1px_rgb(96_165_250)] transition-colors"
                              defaultValue={v.body_part || ''}
                              placeholder="-"
                              onBlur={e => {
                                const val = e.target.value;
                                if (val !== (v.body_part || '')) handleModalLocalUpdate(v.id, { body_part: val });
                              }}
                            />
                          </div>

                          {/* 처방목록 */}
                          <div className="px-2 py-1.5 flex flex-wrap items-center content-center gap-1 border-r border-gray-100 dark:border-slate-700/50 overflow-hidden" onClick={e => e.stopPropagation()}>
                            {matchedPreset && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"
                                style={{
                                  backgroundColor: matchedPreset.color || '#e0e7ff',
                                  color: matchedPreset.textColor || '#3730a3',
                                  border: `1px solid ${matchedPreset.textColor ? `${matchedPreset.textColor}40` : '#c7d2fe'}`,
                                }}
                              >{matchedPreset.name} 세트</span>
                            )}
                            {treatmentParts.map((part, idx) => (
                              <span key={idx} className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-1 border border-indigo-100 dark:border-indigo-800/40 rounded whitespace-nowrap">{part}</span>
                            ))}
                            {treatmentParts.length === 0 && !matchedPreset && <span className="text-[10px] text-gray-400">-</span>}
                          </div>

                          {/* 추가사항 */}
                          <div className="px-1.5 py-1 flex flex-wrap items-center content-center gap-1 border-r border-gray-100 dark:border-slate-700/50">
                            {activeStatuses.length > 0 ? activeStatuses.map(k => (
                              <span key={k} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white ${STATUS_PILL_MAP[k].bg}`}>{STATUS_PILL_MAP[k].label}</span>
                            )) : <span className="text-[10px] text-gray-400">-</span>}
                          </div>

                          {/* 담당 (Author select linked to saved options) */}
                          <div className="border-r border-gray-100 dark:border-slate-700/50 p-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                            <select
                              className="w-full h-full min-h-[36px] text-[11px] font-bold text-center bg-transparent outline-none cursor-pointer focus:shadow-[inset_0_0_0_1px_rgb(96_165_250)] text-gray-700 dark:text-gray-300"
                              value={v.author || ''}
                              onChange={e => handleModalLocalUpdate(v.id, { author: e.target.value })}
                            >
                              <option value="">-</option>
                              {authorOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>

                          {/* 메모 */}
                          <div className="border-r border-gray-100 dark:border-slate-700/50 p-0" onClick={e => e.stopPropagation()}>
                            <input
                              className="w-full h-full min-h-[36px] px-1.5 text-[10px] font-medium bg-transparent text-gray-600 dark:text-gray-400 outline-none focus:bg-brand-50 dark:focus:bg-brand-900/30 focus:shadow-[inset_0_0_0_1px_rgb(96_165_250)] transition-colors"
                              defaultValue={v.memo || ''}
                              placeholder="-"
                              onBlur={e => {
                                const val = e.target.value;
                                if (val !== (v.memo || '')) handleModalLocalUpdate(v.id, { memo: val });
                              }}
                            />
                          </div>

                          {/* 특이사항 */}
                          <div className="p-0" onClick={e => e.stopPropagation()}>
                            <input
                              className="w-full h-full min-h-[36px] px-1.5 text-[10px] font-medium bg-transparent text-orange-600 dark:text-orange-400 outline-none focus:bg-brand-50 dark:focus:bg-brand-900/30 focus:shadow-[inset_0_0_0_1px_rgb(96_165_250)] transition-colors"
                              defaultValue={v.special_note || ''}
                              placeholder="-"
                              onBlur={e => {
                                const val = e.target.value;
                                if (val !== (v.special_note || '')) handleModalLocalUpdate(v.id, { special_note: val });
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Memo / Special Note History (Compact) */}
            {(memoHistory.length > 0 || specialNoteHistory.length > 0) && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {memoHistory.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1"><Edit3 className="w-3 h-3" /> 메모 내역</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {memoHistory.map((item) => (
                           <button 
                             key={`${item.id}-${item.visitDate}`} 
                             onClick={() => toggleMemoText(item.memo)}
                             className={`text-left text-[11px] px-2.5 py-1 rounded border transition-colors max-w-[200px] truncate ${selectedMemoTexts.has(item.memo) ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-900/30 dark:border-brand-700 dark:text-brand-300 font-bold shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700'}`}
                             title={item.memo}
                           >
                             <span className="text-[9px] text-gray-400 mr-1.5">{item.visitDate.slice(5)}</span>
                             {item.memo}
                           </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {specialNoteHistory.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-orange-500/80 dark:text-orange-400/80 mb-1.5 flex items-center gap-1 text-left">⚠️ 특이사항 내역</h4>
                      <div className="flex flex-wrap gap-1.5 text-left">
                        {specialNoteHistory.map((item) => (
                           <button 
                             key={`${item.id}-${item.visitDate}-special`} 
                             onClick={() => toggleSpecialNoteText(item.specialNote)}
                             className={`text-left text-[11px] px-2.5 py-1 rounded border transition-colors max-w-[200px] truncate ${selectedSpecialNoteTexts.has(item.specialNote) ? 'bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300 font-bold shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700'}`}
                             title={item.specialNote}
                           >
                             <span className="text-[9px] text-gray-400 mr-1.5">{item.visitDate.slice(5)}</span>
                             {item.specialNote}
                           </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer */}
             <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 flex justify-between items-center rounded-b-2xl shrink-0 mt-auto">
               <div className="text-[12px] text-gray-500 dark:text-gray-400">
                  {selectedResult ? (
                    <>선택된 항목: <span className="font-bold text-brand-700 dark:text-brand-400">{(selectedResult.patient_name || '이름 없음')} ({selectedResult.visit_date.slice(5)})</span></>
                  ) : <span className="italic flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>가져올 항목을 목록에서 선택해주세요.</span>}
               </div>
               <div className="flex items-center gap-2.5">
                 <button onClick={resetSearchModal} className="px-4 py-2 text-sm font-bold text-gray-600 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg transition-colors shadow-sm">취소</button>
                 <button onClick={(e) => { e.stopPropagation(); void handleImportToToday(); }} disabled={!selectedResult} className={`px-6 py-2 text-sm font-black rounded-lg shadow-md transition-all ${selectedResult ? 'bg-brand-600 hover:bg-brand-700 hover:shadow-lg text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}>
                   ✓ 선택 항목 적용
                 </button>
               </div>
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
