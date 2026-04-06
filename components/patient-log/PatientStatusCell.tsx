
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
  const [typedQuery, setTypedQuery] = useState('');
  const [isTypingQuery, setIsTypingQuery] = useState(false);
  const { handleGridKeyDown } = useGridNavigation(11);
  const normalizedStatusOptions = normalizeStatusOptions(statusOptions);
  const isEditingTypedInputTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest('[data-status-typed-input="true"]');
  const isHangulLikeKey = (key: string) => /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(key);

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
    focusTypedStatusInput();
  };

  const applyTypedStatusQuery = async () => {
    const query = (typedQueryInputRef.current?.value ?? typedQuery).trim();
    if (!query) {
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
    const isPlainTypingKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isIMEKey && !isHangulLikeKey(e.key);

    if (!menuPos && (isPlainTypingKey || isIMEKey || isHangulLikeKey(e.key))) {
      if (isPlainTypingKey) e.preventDefault();
      e.stopPropagation();
      beginTypedStatusEntry(isPlainTypingKey ? e.key : '');
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
      onCompositionStart={() => {
        typedQueryCompositionRef.current = true;
        setIsTypingQuery(true);
      }}
      onCompositionEnd={(e) => {
        typedQueryCompositionRef.current = false;
        setTypedQuery(e.currentTarget.value);
        setIsTypingQuery(!!e.currentTarget.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.stopPropagation();
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          if (!typedQuery.trim()) {
            executeInteraction(e, true);
            return;
          }
          if (typedQueryCompositionRef.current) {
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
        className="w-[calc(100%-4px)] h-[calc(100%-4px)] m-[2px] rounded-[1px] flex items-center justify-start cursor-pointer hover:bg-slate-200/55 dark:hover:bg-slate-700/70 transition-all duration-150 group outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:outline-offset-[-1px] focus:z-10"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          cellRef.current?.focus();
          if (!menuPos && !selectedStatusKeyRef.current) {
            focusTypedStatusInput();
          }
        }}
        onClick={() => {
          cellRef.current?.focus();
          if (!menuPos && !selectedStatusKeyRef.current) {
            focusTypedStatusInput();
          }
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
          <div className="w-full min-h-0 px-1.5 py-0 flex items-center justify-start">
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
              {renderTypedStatusInput(
                isTypingQuery
                  ? 'min-w-[1.75ch] max-w-[84px] bg-transparent outline-none border-none text-[13px] font-black text-slate-600 dark:text-slate-200 px-1 py-0.5'
                  : 'w-[1px] min-w-[1px] bg-transparent outline-none border-none text-transparent px-0 py-0'
              )}
            </div>
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
