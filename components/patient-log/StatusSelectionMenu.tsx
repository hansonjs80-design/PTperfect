import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Settings2, Trash2 } from 'lucide-react';
import { PatientVisit } from '../../types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ContextMenu } from '../common/ContextMenu';

type StatusKey = 'is_injection' | 'is_fluid' | 'is_manual' | 'is_eswt' | 'is_traction' | 'is_ion' | 'is_exercise';

interface StatusSelectionMenuProps {
  visit?: PatientVisit;
  position: { x: number; y: number };
  onClose: () => void;
  onToggle: (key: keyof PatientVisit) => void;
  title: string;
}

interface StatusOptionConfig {
  key: StatusKey;
  label: string;
  visible: boolean;
  order: number;
}

const DEFAULT_STATUS_OPTIONS: StatusOptionConfig[] = [
  { key: 'is_injection', label: '주사', visible: true, order: 0 },
  { key: 'is_fluid', label: '수액', visible: true, order: 1 },
  { key: 'is_manual', label: '도수', visible: true, order: 2 },
  { key: 'is_eswt', label: '충격파', visible: true, order: 3 },
  { key: 'is_traction', label: '견인', visible: true, order: 4 },
  { key: 'is_ion', label: '이온', visible: true, order: 5 },
  { key: 'is_exercise', label: '운동', visible: true, order: 6 },
];

const sortStatusOptions = (options: StatusOptionConfig[]) => [...options].sort((a, b) => a.order - b.order);

export const StatusSelectionMenu: React.FC<StatusSelectionMenuProps> = ({
  visit,
  position,
  onClose,
  onToggle,
  title
}) => {
  const [statusOptions, setStatusOptions] = useLocalStorage<StatusOptionConfig[]>('patient-log-status-options-v1', DEFAULT_STATUS_OPTIONS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const orderedStatusOptions = useMemo(() => sortStatusOptions(statusOptions), [statusOptions]);
  const visibleStatusOptions = useMemo(() => orderedStatusOptions.filter((opt) => opt.visible), [orderedStatusOptions]);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const initialIndex = useMemo(() => {
    const activeIdx = visibleStatusOptions.findIndex((opt) => visit ? !!visit[opt.key] : false);
    return activeIdx >= 0 ? activeIdx : 0;
  }, [visibleStatusOptions, visit]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [activeKeys, setActiveKeys] = useState<Set<StatusKey>>(new Set());

  useEffect(() => {
    const next = new Set<StatusKey>();
    orderedStatusOptions.forEach((opt) => {
      if (visit?.[opt.key]) {
        next.add(opt.key);
      }
    });
    setActiveKeys(next);
  }, [orderedStatusOptions, visit]);

  useEffect(() => {
    setActiveIndex((prev) => {
      if (visibleStatusOptions.length === 0) return 0;
      return Math.min(prev, visibleStatusOptions.length - 1);
    });
  }, [visibleStatusOptions.length]);

  useEffect(() => {
    if (isSettingsOpen) return;
    setActiveIndex(initialIndex);
  }, [initialIndex, isSettingsOpen]);

  useEffect(() => {
    if (isSettingsOpen) return;
    buttonRefs.current[activeIndex]?.focus();
  }, [activeIndex, isSettingsOpen]);

  const toggleSelection = useCallback((index: number) => {
    const option = visibleStatusOptions[index];
    if (!option) return;
    setActiveKeys((prev) => {
      const next = new Set(prev);
      if (next.has(option.key)) next.delete(option.key);
      else next.add(option.key);
      return next;
    });
    onToggle(option.key);
  }, [onToggle, visibleStatusOptions]);

  const updateStatusOption = useCallback((key: StatusKey, updater: (current: StatusOptionConfig) => StatusOptionConfig) => {
    setStatusOptions((prev) => prev.map((opt) => opt.key === key ? updater(opt) : opt));
  }, [setStatusOptions]);

  const moveStatusOption = useCallback((key: StatusKey, direction: 'up' | 'down') => {
    setStatusOptions((prev) => {
      const ordered = sortStatusOptions(prev);
      const index = ordered.findIndex((opt) => opt.key === key);
      if (index < 0) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= ordered.length) return prev;

      const swapped = [...ordered];
      [swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]];
      return swapped.map((opt, order) => ({ ...opt, order }));
    });
  }, [setStatusOptions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSettingsOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setIsSettingsOpen(false);
        }
        return;
      }

      if (visibleStatusOptions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) => (prev + 1) % visibleStatusOptions.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) => (prev - 1 + visibleStatusOptions.length) % visibleStatusOptions.length);
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        toggleSelection(activeIndex);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const activeOption = visibleStatusOptions[activeIndex];
        const isAlreadySelected = activeOption ? activeKeys.has(activeOption.key) : false;
        if (!isAlreadySelected) {
          toggleSelection(activeIndex);
        }
        onClose();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeIndex, activeKeys, isSettingsOpen, onClose, toggleSelection, visibleStatusOptions]);

  return (
    <ContextMenu
      title={isSettingsOpen ? `${title} 설정` : title}
      position={position}
      onClose={onClose}
      width={isSettingsOpen ? 340 : 256}
      headerActions={(
        <button
          type="button"
          onClick={() => setIsSettingsOpen((prev) => !prev)}
          className={`transition-colors ${isSettingsOpen ? 'text-sky-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
          title="추가 사항 목록 설정"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      )}
    >
      {isSettingsOpen ? (
        <div className="flex flex-col gap-2">
          {orderedStatusOptions.map((opt, idx) => (
            <div key={opt.key} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
              <div className="flex items-center gap-2">
                <input
                  value={opt.label}
                  onChange={(e) => updateStatusOption(opt.key, (current) => ({ ...current, label: e.target.value }))}
                  className="flex-1 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  onClick={() => moveStatusOption(opt.key, 'up')}
                  disabled={idx === 0}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700"
                  title="위로 이동"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStatusOption(opt.key, 'down')}
                  disabled={idx === orderedStatusOptions.length - 1}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700"
                  title="아래로 이동"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                  {opt.visible ? '현재 표시 중' : '숨겨진 항목'}
                </span>
                <button
                  type="button"
                  onClick={() => updateStatusOption(opt.key, (current) => ({ ...current, visible: !current.visible }))}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
                    opt.visible
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300'
                  }`}
                >
                  {opt.visible ? <Trash2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {opt.visible ? '삭제' : '추가'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : visibleStatusOptions.length > 0 ? (
        visibleStatusOptions.map((opt, idx) => {
          const isActive = activeKeys.has(opt.key);
          const isFocusedOption = idx === activeIndex;
          return (
            <button
              key={opt.key}
              type="button"
              ref={(el) => {
                buttonRefs.current[idx] = el;
              }}
              onClick={() => {
                setActiveIndex(idx);
                toggleSelection(idx);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onTouchStart={() => setActiveIndex(idx)}
              className={`flex items-center justify-between p-2 rounded-lg transition-colors text-xs font-bold w-full ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                } ${isFocusedOption ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-slate-800' : ''}`}
            >
              <span>{opt.label}</span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>
          );
        })
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
          표시할 추가 사항이 없습니다. 톱니 버튼에서 항목을 추가하세요.
        </div>
      )}
    </ContextMenu>
  );
};
