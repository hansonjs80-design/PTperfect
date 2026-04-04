
import React, { useEffect, useState, useRef, memo } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { PatientCustomStatus, PatientVisit } from '../../types';
import { DEFAULT_STATUS_OPTIONS, findStatusOptionMatch, normalizeStatusOptions, STATUS_COLOR_OPTIONS, STATUS_OPTIONS_STORAGE_KEY, StatusOptionConfig, StatusSelectionMenu } from './StatusSelectionMenu';
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
  const [typeaheadValue, setTypeaheadValue] = useState('');
  const cellRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const selectedStatusKeyRef = useRef<string | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const targetVisitIdRef = useRef<string | null>(visit?.id ?? null);
  const pendingSnapshotRef = useRef<Partial<PatientVisit> | null>(null);
  const createPromiseRef = useRef<Promise<string> | null>(null);
  const typeaheadQueryRef = useRef('');
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { handleGridKeyDown } = useGridNavigation(11);
  const normalizedStatusOptions = normalizeStatusOptions(statusOptions);
  const visibleStatusOptions = normalizedStatusOptions.filter((option) => option.visible);

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

  const resetTypeahead = () => {
    typeaheadQueryRef.current = '';
    setTypeaheadValue('');
    if (typeaheadTimerRef.current) {
      clearTimeout(typeaheadTimerRef.current);
      typeaheadTimerRef.current = null;
    }
  };

  const queueTypeaheadReset = () => {
    if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
    typeaheadTimerRef.current = setTimeout(() => {
      typeaheadQueryRef.current = '';
      setTypeaheadValue('');
      typeaheadTimerRef.current = null;
    }, 900);
  };

  const focusHiddenInput = () => {
    requestAnimationFrame(() => {
      if (menuPos) return;
      hiddenInputRef.current?.focus();
      const length = hiddenInputRef.current?.value.length ?? 0;
      hiddenInputRef.current?.setSelectionRange(length, length);
    });
  };

  const updateTypeaheadMatch = (nextValue: string) => {
    typeaheadQueryRef.current = nextValue;
    setTypeaheadValue(nextValue);
    if (nextValue) {
      queueTypeaheadReset();
    } else {
      resetTypeahead();
    }
  };

  const executeInteraction = (e: React.MouseEvent | React.KeyboardEvent | React.TouchEvent, isKeyboard: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
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
    const isPlainPrintableKey = e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;

    if (!menuPos && isPlainPrintableKey) {
      focusHiddenInput();
      return;
    }

    if (e.key === 'Enter') {
      if (!menuPos) {
        const matched = findStatusOptionMatch(typeaheadQueryRef.current, visibleStatusOptions);
        if (matched) {
          e.preventDefault();
          e.stopPropagation();
          resetTypeahead();
          void toggleStatus(matched);
          return;
        }
      }

      resetTypeahead();
      executeInteraction(e, true);
      return;
    }

    if (!menuPos && e.key === 'Backspace' && typeaheadQueryRef.current) {
      e.preventDefault();
      e.stopPropagation();
      typeaheadQueryRef.current = typeaheadQueryRef.current.slice(0, -1);
      if (!typeaheadQueryRef.current) {
        resetTypeahead();
      } else {
        queueTypeaheadReset();
      }
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

  useEffect(() => () => {
    if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
  }, []);

  // Helper for title (tooltip)
  const getTitle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return `더블탭하여 추가 사항 변경 (${disableBedSync || rowStatus !== 'active' ? '로그만 수정' : '배드 연동'})`;
    }
    return `더블클릭 또는 Enter로 추가 사항 변경 (${disableBedSync || rowStatus !== 'active' ? '로그만 수정' : '배드 연동'})`;
  };

  return (
    <>
      <div
        ref={cellRef}
        className="relative w-[calc(100%-4px)] h-[calc(100%-4px)] m-[2px] rounded-[1px] flex items-center justify-start cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:outline-offset-[-1px] focus:z-10 focus-within:outline focus-within:outline-2 focus-within:outline-sky-400 focus-within:outline-offset-[-1px] focus-within:z-10"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          cellRef.current?.focus();
          focusHiddenInput();
        }}
        onClick={() => {
          cellRef.current?.focus();
          focusHiddenInput();
        }}
        onFocus={() => {
          if (!menuPos) {
            focusHiddenInput();
          }
        }}
        onBlur={(e) => {
          const nextFocus = e.relatedTarget as Node | null;
          if (nextFocus && cellRef.current?.contains(nextFocus)) return;
          resetTypeahead();
          updateSelectedStatusKey(null);
        }}
        onDoubleClick={executeInteraction}
        onTouchEnd={handleTouchEnd}
        onKeyDownCapture={handleKeyDownCapture}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        data-grid-id={gridId}
        data-status-pill-selected={selectedStatusKey ? 'true' : 'false'}
        title={getTitle()}
      >
        <input
          ref={hiddenInputRef}
          value={typeaheadValue}
          onFocus={(e) => {
            const length = e.currentTarget.value.length;
            e.currentTarget.setSelectionRange(length, length);
          }}
          onChange={(e) => {
            updateTypeaheadMatch(e.target.value);
          }}
          onCompositionEnd={(e) => {
            updateTypeaheadMatch(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const matched = findStatusOptionMatch(typeaheadQueryRef.current, visibleStatusOptions);
              if (matched) {
                e.preventDefault();
                e.stopPropagation();
                resetTypeahead();
                void toggleStatus(matched);
                return;
              }
            }

            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab') && !menuPos) {
              resetTypeahead();
              handleGridKeyDown(e, rowIndex, colIndex, true, hiddenInputRef.current);
            }
          }}
          onBlur={() => {
            if (!menuPos && document.activeElement !== cellRef.current) {
              setTimeout(() => {
                if (document.activeElement !== cellRef.current) {
                  hiddenInputRef.current?.focus();
                  const length = hiddenInputRef.current?.value.length ?? 0;
                  hiddenInputRef.current?.setSelectionRange(length, length);
                }
              }, 0);
            }
          }}
          className="pointer-events-none absolute left-0 top-0 h-0 w-0 opacity-0"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-hidden="true"
        />
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
                  className={`px-1.5 py-0.5 rounded-md text-[13px] font-black ${item.bg} ${item.text} ${selectedStatusKey === item.key ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-slate-800' : ''}`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          typeaheadValue ? (
            <div className="w-full px-1.5 text-[13px] font-black text-slate-700 dark:text-slate-200 truncate">
              {typeaheadValue}
            </div>
          ) : (
            <div className="opacity-0 group-hover:opacity-50 transition-opacity">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </div>
          )
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
            resetTypeahead();
            setTimeout(() => cellRef.current?.focus(), 0);
          }}
          onToggle={toggleStatus}
          title={menuTitle}
        />
      )}
    </>
  );
});
