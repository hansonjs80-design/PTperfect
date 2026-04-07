
import React, { useEffect, useState, useRef, memo } from 'react';
import { PatientCustomStatus, PatientVisit } from '../../types';
import { DEFAULT_STATUS_OPTIONS, findMatchingStatusOption, normalizeStatusOptions, STATUS_COLOR_OPTIONS, STATUS_OPTIONS_STORAGE_KEY, StatusOptionConfig, StatusSelectionMenu } from './StatusSelectionMenu';
import { useGridNavigation } from '../../hooks/useGridNavigation';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface PatientStatusCellProps {
  visit?: PatientVisit;
  rowStatus?: 'active' | 'completed' | 'none';
  onUpdate: (id: string, updates: Partial<PatientVisit>, skipBedSync?: boolean) => void;
  isDraft?: boolean;
  onCreate?: (updates: Partial<PatientVisit>) => Promise<string>;
  gridId?: string;
  rowIndex: number;
  colIndex: number;
  disableBedSync?: boolean;
}

export const PatientStatusCell: React.FC<PatientStatusCellProps> = memo(({
  visit,
  rowStatus = 'none',
  onUpdate,
  isDraft,
  onCreate,
  gridId,
  rowIndex,
  colIndex,
  disableBedSync = false
}) => {
  const [statusOptions] = useLocalStorage(STATUS_OPTIONS_STORAGE_KEY, DEFAULT_STATUS_OPTIONS);
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [selectedStatusKey, setSelectedStatusKey] = useState<string | null>(null);
  const [menuVisitSnapshot, setMenuVisitSnapshot] = useState<Partial<PatientVisit> | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const selectedStatusKeyRef = useRef<string | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const targetVisitIdRef = useRef<string | null>(visit?.id ?? null);
  const pendingSnapshotRef = useRef<Partial<PatientVisit> | null>(null);
  const createPromiseRef = useRef<Promise<string> | null>(null);
  const typedQueryInputRef = useRef<HTMLInputElement>(null);
  const typedQueryCompositionRef = useRef(false);
  const pendingTypedQueryApplyRef = useRef(false);
  const [typedQuery, setTypedQuery] = useState('');
  const [isTypingQuery, setIsTypingQuery] = useState(false);
  const { handleGridKeyDown } = useGridNavigation(11);
  const normalizedStatusOptions = normalizeStatusOptions(statusOptions);
  const isEditingTypedInputTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest('[data-status-typed-input="true"]');
  const isHangulLikeKey = (key: string) => /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(key);
  const HANGUL_CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const HANGUL_JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  const HANGUL_JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const COMPLEX_VOWEL_MAP: Record<string, string> = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
  const COMPLEX_FINAL_MAP: Record<string, string> = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
  const CHO_INDEX = new Map<string, number>(HANGUL_CHO.map((char, index) => [char, index]));
  const JUNG_INDEX = new Map<string, number>(HANGUL_JUNG.map((char, index) => [char, index]));
  const JONG_INDEX = new Map<string, number>(HANGUL_JONG.map((char, index) => [char, index]));

  const composeStatusHangul = (value: string) => {
    const chars = Array.from(value);
    let result = '';

    const mergeTrailingFinalIntoPrevious = (currentIndex: number) => {
      const current = chars[currentIndex];
      if (!CHO_INDEX.has(current) || !result) return null;

      const lastChar = result[result.length - 1];
      const lastCode = lastChar.charCodeAt(0);
      if (lastCode < 0xac00 || lastCode > 0xd7a3) return null;

      const syllableIndex = lastCode - 0xac00;
      const cho = Math.floor(syllableIndex / 588);
      const jung = Math.floor((syllableIndex % 588) / 28);
      const jong = syllableIndex % 28;
      if (jong !== 0) return null;

      const next = chars[currentIndex + 1];
      const nextStartsVowel = !!next && (JUNG_INDEX.has(next) || !!COMPLEX_VOWEL_MAP[`${next}${chars[currentIndex + 2] || ''}`]);
      if (nextStartsVowel) return null;

      let mergedFinal = current;
      let consumed = 1;
      const after = chars[currentIndex + 1];
      const complexFinal = current && after ? COMPLEX_FINAL_MAP[`${current}${after}`] : undefined;
      const afterStartsVowel = !!chars[currentIndex + 2] && (JUNG_INDEX.has(chars[currentIndex + 2]) || !!COMPLEX_VOWEL_MAP[`${chars[currentIndex + 2]}${chars[currentIndex + 3] || ''}`]);
      if (complexFinal && !afterStartsVowel) {
        mergedFinal = complexFinal;
        consumed = 2;
      }

      const jongIndex = JONG_INDEX.get(mergedFinal);
      if (jongIndex == null) return null;

      result = result.slice(0, -1) + String.fromCharCode(0xac00 + cho * 588 + jung * 28 + jongIndex);
      return consumed;
    };

    const readVowel = (start: number) => {
      const first = chars[start];
      const next = chars[start + 1];
      if (first && next) {
        const complex = COMPLEX_VOWEL_MAP[`${first}${next}`];
        if (complex) return { vowel: complex, length: 2 };
      }
      return { vowel: first, length: 1 };
    };

    for (let i = 0; i < chars.length;) {
      const current = chars[i];
      const mergedTrailingFinalLength = mergeTrailingFinalIntoPrevious(i);
      if (mergedTrailingFinalLength) {
        i += mergedTrailingFinalLength;
        continue;
      }

      const choIndex = CHO_INDEX.get(current);
      const next = chars[i + 1];
      const nextIsVowel = next ? JUNG_INDEX.has(next) || !!COMPLEX_VOWEL_MAP[`${next}${chars[i + 2] || ''}`] : false;

      if (choIndex == null || !nextIsVowel) {
        result += current;
        i += 1;
        continue;
      }

      const { vowel, length: vowelLength } = readVowel(i + 1);
      const jungIndex = JUNG_INDEX.get(vowel);
      if (jungIndex == null) {
        result += current;
        i += 1;
        continue;
      }

      let consumed = 1 + vowelLength;
      let jong = '';
      const final1 = chars[i + consumed];
      const final2 = chars[i + consumed + 1];
      const final1IsConsonant = !!final1 && CHO_INDEX.has(final1);
      const final2StartsVowel = !!final2 && (JUNG_INDEX.has(final2) || !!COMPLEX_VOWEL_MAP[`${final2}${chars[i + consumed + 2] || ''}`]);

      if (final1IsConsonant && !final2StartsVowel) {
        const complexFinal = final1 && final2 ? COMPLEX_FINAL_MAP[`${final1}${final2}`] : undefined;
        const final3StartsVowel = !!chars[i + consumed + 2] && (JUNG_INDEX.has(chars[i + consumed + 2]) || !!COMPLEX_VOWEL_MAP[`${chars[i + consumed + 2]}${chars[i + consumed + 3] || ''}`]);
        if (complexFinal && !final3StartsVowel) {
          jong = complexFinal;
          consumed += 2;
        } else {
          jong = final1 || '';
          consumed += 1;
        }
      }

      const jongIndex = JONG_INDEX.get(jong) ?? 0;
      result += String.fromCharCode(0xac00 + choIndex * 588 + jungIndex * 28 + jongIndex);
      i += consumed;
    }

    return result;
  };

  const STATUS_KEYS: Array<keyof PatientVisit> = [
    'is_injection',
    'is_fluid',
    'is_manual',
    'is_eswt',
    'is_traction',
    'is_ion',
    'is_exercise',
  ];

  useEffect(() => {
    if (visit?.id) {
      targetVisitIdRef.current = visit.id;
    }
  }, [visit?.id]);

  useEffect(() => {
    if (menuPos) return;
    targetVisitIdRef.current = visit?.id ?? null;
    pendingSnapshotRef.current = null;
    createPromiseRef.current = null;
    setMenuVisitSnapshot(visit ? { ...visit } : null);
    setIsTypingQuery(false);
    setTypedQuery('');
    updateSelectedStatusKey(null);
  }, [visit?.id, gridId, isDraft, menuPos]);

  useEffect(() => {
    if (!isTypingQuery || menuPos) return;
    const frame = requestAnimationFrame(() => {
      focusTypedStatusInput();
    });
    return () => cancelAnimationFrame(frame);
  }, [isTypingQuery, menuPos]);

  useEffect(() => {
    pendingSnapshotRef.current = menuVisitSnapshot;
  }, [menuVisitSnapshot]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (menuPos) {
      document.body.dataset.patientStatusMenuOpen = 'true';
      return () => {
        delete document.body.dataset.patientStatusMenuOpen;
      };
    }

    delete document.body.dataset.patientStatusMenuOpen;
    return undefined;
  }, [menuPos]);

  const executeInteraction = (e: React.MouseEvent | React.KeyboardEvent | React.TouchEvent, isKeyboard: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTypingQuery(false);
    setTypedQuery('');
    targetVisitIdRef.current = visit?.id ?? null;
    setMenuVisitSnapshot(visit ? { ...visit } : {});

    if (isKeyboard && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom });
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      setMenuPos({ x: touch.clientX, y: touch.clientY });
    } else {
      const mouseEvent = e as React.MouseEvent;
      setMenuPos({ x: mouseEvent.clientX, y: mouseEvent.clientY });
    }
  };

  const focusTypedStatusInput = () => {
    if (menuPos || selectedStatusKeyRef.current) return;
    const input = typedQueryInputRef.current;
    if (!input) return;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  };

  const beginTypedStatusEntry = (seed = '') => {
    updateSelectedStatusKey(null);
    setIsTypingQuery(true);
    setTypedQuery(seed);
    requestAnimationFrame(() => {
      focusTypedStatusInput();
    });
  };

  const applyTypedStatusQuery = async () => {
    const query = composeStatusHangul(typedQueryInputRef.current?.value ?? typedQuery).trim();
    if (!query) {
      pendingTypedQueryApplyRef.current = false;
      setIsTypingQuery(false);
      setTypedQuery('');
      cellRef.current?.focus();
      return;
    }

    const matched = findMatchingStatusOption(normalizedStatusOptions.filter((option) => option.visible), query);
    if (matched) {
      const isAlreadyActive = matched.kind === 'predefined'
        ? !!menuDisplayVisit?.[matched.key as keyof PatientVisit]
        : !!menuDisplayVisit?.custom_statuses?.some((status) => status.id === matched.id);
      if (!isAlreadyActive) {
        await toggleStatus(matched);
      }
    }

    setIsTypingQuery(false);
    setTypedQuery('');
    pendingTypedQueryApplyRef.current = false;
    requestAnimationFrame(() => cellRef.current?.focus());
  };

  const clearAllStatuses = async () => {
    const targetVisitId = targetVisitIdRef.current;
    const baseSnapshot = pendingSnapshotRef.current || visit || {};
    const hasAnyStatus = STATUS_KEYS.some((statusKey) => !!baseSnapshot[statusKey]) || !!baseSnapshot.custom_statuses?.length;

    setIsTypingQuery(false);
    setTypedQuery('');
    updateSelectedStatusKey(null);

    if (!hasAnyStatus) {
      cellRef.current?.focus();
      return;
    }

    const snapshotUpdates = Object.fromEntries(
      STATUS_KEYS.map((statusKey) => [statusKey, false])
    ) as Partial<PatientVisit> & { custom_statuses?: PatientCustomStatus[] };
    snapshotUpdates.custom_statuses = [];

    const clearedSnapshot = {
      ...baseSnapshot,
      ...snapshotUpdates,
    } as Partial<PatientVisit>;

    pendingSnapshotRef.current = clearedSnapshot;
    setMenuVisitSnapshot(clearedSnapshot);

    const skipSync = disableBedSync || rowStatus !== 'active';

    if (targetVisitId) {
      onUpdate(targetVisitId, snapshotUpdates, skipSync);
      requestAnimationFrame(() => cellRef.current?.focus());
      return;
    }

    if (visit) {
      onUpdate(visit.id, snapshotUpdates, skipSync);
    }

    requestAnimationFrame(() => cellRef.current?.focus());
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    cellRef.current?.focus();

    const now = Date.now();
    const timeDiff = now - lastClickTimeRef.current;

    if (timeDiff < 350 && timeDiff > 0) {
      executeInteraction(e);
      lastClickTimeRef.current = 0;
    } else {
      lastClickTimeRef.current = now;
    }
  };

  const deleteStatusByKey = async (statusKey: string) => {
    const targetVisitId = targetVisitIdRef.current;
    const baseSnapshot = pendingSnapshotRef.current || visit || {};
    const currentCustomStatuses = [...(baseSnapshot.custom_statuses || [])] as PatientCustomStatus[];
    const nextSnapshot = { ...baseSnapshot } as Partial<PatientVisit>;

    const predefinedOption = normalizedStatusOptions.find((option) => option.id === statusKey && option.kind === 'predefined' && option.key);
    if (predefinedOption?.key) {
      nextSnapshot[predefinedOption.key] = false;
    } else {
      nextSnapshot.custom_statuses = currentCustomStatuses
        .filter((status) => status.id !== statusKey)
        .sort((a, b) => a.order - b.order);
    }

    const snapshotUpdates = Object.fromEntries(
      STATUS_KEYS.map((statusKeyItem) => [statusKeyItem, !!nextSnapshot[statusKeyItem]])
    ) as Partial<PatientVisit> & { custom_statuses?: PatientCustomStatus[] };
    snapshotUpdates.custom_statuses = [...(nextSnapshot.custom_statuses || [])];
    const skipSync = disableBedSync || rowStatus !== 'active';

    setMenuVisitSnapshot(nextSnapshot);

    if (targetVisitId) {
      onUpdate(targetVisitId, snapshotUpdates, skipSync);
      return;
    }

    if (isDraft && onCreate) {
      if (!createPromiseRef.current) {
        createPromiseRef.current = onCreate(snapshotUpdates);
      }

      const createdId = await createPromiseRef.current;
      targetVisitIdRef.current = createdId;
      createPromiseRef.current = null;
      onUpdate(createdId, snapshotUpdates, skipSync);
      return;
    }

    if (visit) {
      onUpdate(visit.id, snapshotUpdates, skipSync);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditingTypedInputTarget(e.target)) return;

    const nativeEvt = e.nativeEvent as KeyboardEvent & { keyCode?: number; which?: number };
    const isIMEKey = nativeEvt.isComposing || e.key === 'Process' || nativeEvt.keyCode === 229 || nativeEvt.which === 229;
    const isHangulTypingKey = !e.ctrlKey && !e.metaKey && !e.altKey && isHangulLikeKey(e.key);
    const isPlainTypingKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isIMEKey && !isHangulTypingKey;

    if (!menuPos && (isHangulTypingKey || isIMEKey)) {
      e.stopPropagation();
      focusTypedStatusInput();
      return;
    }

    if (!menuPos && isPlainTypingKey) {
      e.preventDefault();
      e.stopPropagation();
      beginTypedStatusEntry(e.key);
      return;
    }

    if (e.key === 'Enter') {
      if (!menuPos && typedQuery.trim()) {
        e.preventDefault();
        e.stopPropagation();
        void applyTypedStatusQuery();
        return;
      }
      executeInteraction(e, true);
      return;
    }

    if (!menuPos && e.key === 'Escape' && typedQuery) {
      e.preventDefault();
      e.stopPropagation();
      setIsTypingQuery(false);
      setTypedQuery('');
      cellRef.current?.focus();
      return;
    }

    if ((e.key === 'Backspace' || e.key === 'Delete') && selectedStatusKey) {
      e.preventDefault();
      e.stopPropagation();
      void deleteStatusByKey(selectedStatusKeyRef.current || selectedStatusKey);
      updateSelectedStatusKey(null);
      return;
    }

    if (!menuPos && !selectedStatusKey && !typedQuery.trim() && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      e.stopPropagation();
      void clearAllStatuses();
      return;
    }

    handleGridKeyDown(e, rowIndex, colIndex);
  };

  const handleKeyDownCapture = (e: React.KeyboardEvent) => {
    if (isEditingTypedInputTarget(e.target)) return;

    if (e.key === 'Enter' && !menuPos && !typedQuery.trim()) {
      e.preventDefault();
      e.stopPropagation();
      executeInteraction(e, true);
      return;
    }

    if ((e.key === 'Backspace' || e.key === 'Delete') && selectedStatusKey) {
      e.preventDefault();
      e.stopPropagation();
      void deleteStatusByKey(selectedStatusKeyRef.current || selectedStatusKey);
      updateSelectedStatusKey(null);
      return;
    }

    if (!menuPos && !selectedStatusKey && !typedQuery.trim() && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      e.stopPropagation();
      void clearAllStatuses();
    }
  };

  const toggleStatus = async (option: StatusOptionConfig) => {
    const targetVisitId = targetVisitIdRef.current;
    const baseSnapshot = pendingSnapshotRef.current || visit || {};
    const currentCustomStatuses = [...(baseSnapshot.custom_statuses || [])] as PatientCustomStatus[];
    const nextSnapshot = { ...baseSnapshot } as Partial<PatientVisit>;

    if (option.kind === 'predefined' && option.key) {
      const currentVal = !!baseSnapshot[option.key];
      nextSnapshot[option.key] = !currentVal;
    } else {
      const existingIndex = currentCustomStatuses.findIndex((status) => status.id === option.id);
      if (existingIndex >= 0) {
        currentCustomStatuses.splice(existingIndex, 1);
      } else {
        currentCustomStatuses.push({
          id: option.id,
          label: option.label,
          color: option.color,
          order: option.order,
        });
      }
      nextSnapshot.custom_statuses = currentCustomStatuses.sort((a, b) => a.order - b.order);
    }

    const snapshotUpdates = Object.fromEntries(
      STATUS_KEYS.map((statusKey) => [statusKey, !!nextSnapshot[statusKey]])
    ) as Partial<PatientVisit> & { custom_statuses?: PatientCustomStatus[] };
    snapshotUpdates.custom_statuses = [...(nextSnapshot.custom_statuses || [])];
    const skipSync = disableBedSync || rowStatus !== 'active';

    setMenuVisitSnapshot(nextSnapshot);

    if (targetVisitId) {
      // 팝업 선택 중에는 전체 추가사항 상태를 같은 행에 다시 써서 누락/경합을 막는다.
      onUpdate(targetVisitId, snapshotUpdates, skipSync);
      return;
    }

    if (isDraft && onCreate) {
      if (!createPromiseRef.current) {
        createPromiseRef.current = onCreate(snapshotUpdates);
      }

      const createdId = await createPromiseRef.current;
      targetVisitIdRef.current = createdId;
      createPromiseRef.current = null;
      const latestSnapshot = pendingSnapshotRef.current || nextSnapshot;
      const createdSnapshotUpdates = Object.fromEntries(
        STATUS_KEYS.map((statusKey) => [statusKey, !!latestSnapshot[statusKey]])
      ) as Partial<PatientVisit> & { custom_statuses?: PatientCustomStatus[] };
      createdSnapshotUpdates.custom_statuses = [...(latestSnapshot.custom_statuses || [])];
      onUpdate(createdId, createdSnapshotUpdates, skipSync);
    } else if (visit) {
      onUpdate(visit.id, snapshotUpdates, skipSync);
    }
  };

  const menuTitle = disableBedSync || rowStatus !== 'active' ? "추가 사항 변경 (단순 기록)" : "추가 사항 변경 (배드 연동)";

  const menuDisplayVisit = menuPos ? { ...(visit || {}), ...(menuVisitSnapshot || {}) } as Partial<PatientVisit> : visit;
  const cellDisplayVisit = menuPos && isDraft && (targetVisitIdRef.current || createPromiseRef.current)
    ? undefined
    : menuDisplayVisit;

  const hasActiveStatus = !!cellDisplayVisit && (
    cellDisplayVisit.is_injection ||
    cellDisplayVisit.is_fluid ||
    cellDisplayVisit.is_manual ||
    cellDisplayVisit.is_eswt ||
    cellDisplayVisit.is_traction ||
    cellDisplayVisit.is_ion ||
    cellDisplayVisit.is_exercise ||
    !!cellDisplayVisit.custom_statuses?.length
  );

  const statusPills = [
    ...normalizedStatusOptions
      .filter((option) => {
        if (option.kind === 'predefined') return true;
        return !!cellDisplayVisit?.custom_statuses?.some((status) => status.id === option.id);
      })
      .map((option) => {
        const palette = STATUS_COLOR_OPTIONS[option.color];
        return {
          key: option.id,
          active: option.kind === 'predefined'
            ? !!cellDisplayVisit?.[option.key as keyof PatientVisit]
            : !!cellDisplayVisit?.custom_statuses?.some((status) => status.id === option.id),
          label: option.label,
          bg: palette.button,
          text: palette.buttonText,
        };
      }),
    ...(cellDisplayVisit?.custom_statuses || [])
      .filter((status) => !normalizedStatusOptions.some((option) => option.id === status.id))
      .map((status) => {
        const palette = STATUS_COLOR_OPTIONS[status.color as keyof typeof STATUS_COLOR_OPTIONS] || STATUS_COLOR_OPTIONS.pink;
        return {
          key: status.id,
          active: true,
          label: status.label,
          bg: palette.button,
          text: palette.buttonText,
        };
      }),
  ] as ReadonlyArray<{ key: string; active: boolean; label: string; bg: string; text: string }>;

  const activeStatusPills = statusPills.filter((item) => item.active);

  const updateSelectedStatusKey = (nextKey: string | null) => {
    selectedStatusKeyRef.current = nextKey;
    setSelectedStatusKey(nextKey);
  };

  useEffect(() => {
    if (!selectedStatusKey) return;
    const stillActive = activeStatusPills.some((item) => item.key === selectedStatusKey);
    if (!stillActive) {
      updateSelectedStatusKey(null);
    }
  }, [selectedStatusKey, activeStatusPills]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (selectedStatusKey) {
      document.body.dataset.statusPillSelected = 'true';
      return () => {
        delete document.body.dataset.statusPillSelected;
      };
    }

    delete document.body.dataset.statusPillSelected;
    return undefined;
  }, [selectedStatusKey]);

  useEffect(() => {
    if (!selectedStatusKey) return;

    const handleWindowDelete = (event: KeyboardEvent) => {
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;

      const activeElement = document.activeElement as HTMLElement | null;
      const cellElement = cellRef.current;
      if (!cellElement) return;
      if (activeElement && activeElement !== cellElement && !cellElement.contains(activeElement)) return;

      const selectedKey = selectedStatusKeyRef.current || selectedStatusKey;
      if (!selectedKey) return;

      event.preventDefault();
      event.stopPropagation();
      void deleteStatusByKey(selectedKey);
      updateSelectedStatusKey(null);
    };

    window.addEventListener('keydown', handleWindowDelete, true);
    return () => window.removeEventListener('keydown', handleWindowDelete, true);
  }, [selectedStatusKey, normalizedStatusOptions]);

  // Helper for title (tooltip)
  const getTitle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return `더블탭하여 추가 사항 변경 (${disableBedSync || rowStatus !== 'active' ? '로그만 수정' : '배드 연동'})`;
    }
    return `더블클릭 또는 Enter로 추가 사항 변경 (${disableBedSync || rowStatus !== 'active' ? '로그만 수정' : '배드 연동'})`;
  };

  const renderTypedStatusInput = (className: string) => (
    <input
      ref={typedQueryInputRef}
      data-status-typed-input="true"
      value={typedQuery}
      onChange={(e) => {
        setTypedQuery(e.target.value);
        if (!isTypingQuery && e.target.value) {
          setIsTypingQuery(true);
        }
      }}
      onCompositionStart={(e) => {
        typedQueryCompositionRef.current = true;
        pendingTypedQueryApplyRef.current = false;
        setTypedQuery(e.currentTarget.value);
        setIsTypingQuery(true);
      }}
      onCompositionEnd={(e) => {
        typedQueryCompositionRef.current = false;
        const nextValue = e.currentTarget.value;
        setTypedQuery(nextValue);
        setIsTypingQuery(!!nextValue);
        if (pendingTypedQueryApplyRef.current) {
          requestAnimationFrame(() => {
            void applyTypedStatusQuery();
          });
        }
      }}
      onKeyDown={(e) => {
        const currentValue = (typedQueryInputRef.current?.value ?? typedQuery).trim();
        if (
          !typedQueryCompositionRef.current &&
          !currentValue &&
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)
        ) {
          e.preventDefault();
          e.stopPropagation();
          requestAnimationFrame(() => cellRef.current?.focus());
          handleGridKeyDown(e, rowIndex, colIndex);
          return;
        }

        if (e.key === 'Backspace' || e.key === 'Delete') {
          if (!currentValue) {
            e.preventDefault();
            e.stopPropagation();
            void clearAllStatuses();
            return;
          }
          e.stopPropagation();
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          if (!currentValue) {
            executeInteraction(e, true);
            return;
          }
          if (typedQueryCompositionRef.current) {
            pendingTypedQueryApplyRef.current = true;
            return;
          }
          void applyTypedStatusQuery();
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setIsTypingQuery(false);
          setTypedQuery('');
          requestAnimationFrame(() => cellRef.current?.focus());
          return;
        }
      }}
      onBlur={() => {
        requestAnimationFrame(() => {
          const active = document.activeElement as HTMLElement | null;
          if (active && cellRef.current?.contains(active)) return;
          setIsTypingQuery(false);
          setTypedQuery('');
        });
      }}
      onDoubleClick={(e) => {
        executeInteraction(e);
      }}
      className={className}
      style={{ caretColor: isTypingQuery ? undefined : 'transparent' }}
    />
  );

  return (
    <>
      <div
        ref={cellRef}
        className="w-[calc(100%-4px)] h-[calc(100%-4px)] m-[2px] rounded-[1px] flex items-center justify-start cursor-pointer hover:bg-slate-200/55 dark:hover:bg-slate-700/70 transition-all duration-150 group outline-none focus:outline-none focus:ring-0 focus:z-10"
        onFocus={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.relatedTarget && cellRef.current?.contains(e.relatedTarget as Node)) return;
          if (menuPos || selectedStatusKeyRef.current) return;

          requestAnimationFrame(() => {
            focusTypedStatusInput();
          });
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if (e.shiftKey) {
            cellRef.current?.focus();
            return;
          }
          updateSelectedStatusKey(null);
          if (!menuPos && !selectedStatusKeyRef.current) {
            e.preventDefault();
            focusTypedStatusInput();
            return;
          }
          cellRef.current?.focus();
        }}
        onClick={(e) => {
          if (e.shiftKey) {
            cellRef.current?.focus();
            return;
          }
          updateSelectedStatusKey(null);
          if (!menuPos && !selectedStatusKeyRef.current) {
            focusTypedStatusInput();
            return;
          }
          cellRef.current?.focus();
        }}
        onBlur={(e) => {
          const nextFocus = e.relatedTarget as Node | null;
          if (nextFocus && cellRef.current?.contains(nextFocus)) return;
          updateSelectedStatusKey(null);
        }}
        onDoubleClickCapture={executeInteraction}
        onDoubleClick={executeInteraction}
        onTouchEnd={handleTouchEnd}
        onKeyDownCapture={handleKeyDownCapture}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        data-grid-id={gridId}
        data-status-pill-selected={selectedStatusKey ? 'true' : 'false'}
        title={getTitle()}
      >
        {hasActiveStatus ? (
          <div className={`w-full min-h-0 px-1.5 ${isTypingQuery ? 'py-0.5 flex flex-col items-start justify-center gap-1' : 'py-0 flex items-center justify-start'}`}>
            <div className="flex flex-wrap items-center justify-start gap-1 max-w-full">
              {activeStatusPills.map((item) => (
                <span
                  key={item.key}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    cellRef.current?.focus();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    cellRef.current?.focus();
                    updateSelectedStatusKey(selectedStatusKeyRef.current === item.key ? null : item.key);
                  }}
                  onDoubleClick={(e) => {
                    executeInteraction(e);
                  }}
                  className={`px-1.5 py-0.5 rounded-md text-[13px] font-black transition-transform duration-150 group-hover:scale-[1.04] transform-gpu ${item.bg} ${item.text} ${selectedStatusKey === item.key ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-slate-800' : ''}`}
                >
                  {item.label}
                </span>
              ))}
              {!isTypingQuery && renderTypedStatusInput(
                'w-[1px] min-w-[1px] bg-transparent outline-none border-none text-transparent px-0 py-0'
              )}
            </div>
            {isTypingQuery && renderTypedStatusInput(
              'w-full bg-transparent outline-none border-none text-[13px] font-black text-slate-600 dark:text-slate-200 px-1 py-0.5'
            )}
          </div>
        ) : (
          <div className="w-full px-1.5 py-0 flex items-center justify-start">
            {renderTypedStatusInput(
              isTypingQuery
                ? 'w-full bg-transparent outline-none border-none text-[13px] font-black text-slate-600 dark:text-slate-200 px-1 py-0.5'
                : 'w-full bg-transparent outline-none border-none text-transparent px-1 py-0.5'
            )}
            {!isTypingQuery && <div className="w-full h-full" />}
          </div>
        )}
      </div>

      {menuPos && (
        <StatusSelectionMenu
          visit={menuDisplayVisit as PatientVisit | undefined}
          position={menuPos}
          onClose={() => {
            setMenuPos(null);
            setMenuVisitSnapshot(null);
            pendingSnapshotRef.current = null;
            createPromiseRef.current = null;
            targetVisitIdRef.current = visit?.id ?? null;
            setTimeout(() => cellRef.current?.focus(), 0);
          }}
          onToggle={toggleStatus}
          title={menuTitle}
        />
      )}
    </>
  );
});
