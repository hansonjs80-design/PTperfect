import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Plus, Settings2, Trash2 } from 'lucide-react';
import { PatientCustomStatus, PatientVisit } from '../../types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ContextMenu } from '../common/ContextMenu';

export type StatusKey = 'is_injection' | 'is_fluid' | 'is_manual' | 'is_eswt' | 'is_traction' | 'is_ion' | 'is_exercise';
export type StatusColorKey = 'red' | 'sky' | 'violet' | 'blue' | 'orange' | 'emerald' | 'lime' | 'pink';
export const STATUS_OPTIONS_STORAGE_KEY = 'patient-log-status-options-v1';

export interface StatusColorOption {
  key: StatusColorKey;
  dot: string;
  button: string;
  buttonText: string;
  menuActive: string;
}

export const STATUS_COLOR_OPTIONS: Record<StatusColorKey, StatusColorOption> = {
  red: {
    key: 'red',
    dot: 'bg-red-500',
    button: 'bg-red-500',
    buttonText: 'text-white',
    menuActive: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  },
  sky: {
    key: 'sky',
    dot: 'bg-sky-500',
    button: 'bg-sky-500',
    buttonText: 'text-white',
    menuActive: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
  },
  violet: {
    key: 'violet',
    dot: 'bg-violet-500',
    button: 'bg-violet-500',
    buttonText: 'text-white',
    menuActive: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300',
  },
  blue: {
    key: 'blue',
    dot: 'bg-blue-500',
    button: 'bg-blue-500',
    buttonText: 'text-white',
    menuActive: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  },
  orange: {
    key: 'orange',
    dot: 'bg-orange-500',
    button: 'bg-orange-500',
    buttonText: 'text-white',
    menuActive: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
  },
  emerald: {
    key: 'emerald',
    dot: 'bg-emerald-500',
    button: 'bg-emerald-500',
    buttonText: 'text-white',
    menuActive: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  },
  lime: {
    key: 'lime',
    dot: 'bg-lime-500',
    button: 'bg-lime-500',
    buttonText: 'text-slate-900',
    menuActive: 'bg-lime-50 text-lime-700 dark:bg-lime-900/20 dark:text-lime-300',
  },
  pink: {
    key: 'pink',
    dot: 'bg-pink-500',
    button: 'bg-pink-500',
    buttonText: 'text-white',
    menuActive: 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300',
  },
};

const STATUS_MENU_ROW_STYLES: Record<StatusColorKey, { accent: string; surface: string }> = {
  red: {
    accent: 'bg-red-500',
    surface: 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100',
  },
  sky: {
    accent: 'bg-sky-500',
    surface: 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100',
  },
  violet: {
    accent: 'bg-violet-500',
    surface: 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100',
  },
  blue: {
    accent: 'bg-blue-500',
    surface: 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100',
  },
  orange: {
    accent: 'bg-orange-500',
    surface: 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100',
  },
  emerald: {
    accent: 'bg-emerald-500',
    surface: 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100',
  },
  lime: {
    accent: 'bg-lime-500',
    surface: 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100',
  },
  pink: {
    accent: 'bg-pink-500',
    surface: 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100',
  },
};

interface StatusSelectionMenuProps {
  visit?: PatientVisit;
  position: { x: number; y: number };
  onClose: () => void;
  onToggle: (option: StatusOptionConfig) => void;
  title: string;
}

export interface StatusOptionConfig {
  id: string;
  kind: 'predefined' | 'custom';
  key?: StatusKey;
  label: string;
  visible: boolean;
  order: number;
  color: StatusColorKey;
}

export const DEFAULT_STATUS_OPTIONS: StatusOptionConfig[] = [
  { id: 'is_injection', kind: 'predefined', key: 'is_injection', label: '주사', visible: true, order: 0, color: 'red' },
  { id: 'is_fluid', kind: 'predefined', key: 'is_fluid', label: '수액', visible: true, order: 1, color: 'sky' },
  { id: 'is_manual', kind: 'predefined', key: 'is_manual', label: '도수', visible: true, order: 2, color: 'violet' },
  { id: 'is_eswt', kind: 'predefined', key: 'is_eswt', label: '충격파', visible: true, order: 3, color: 'blue' },
  { id: 'is_traction', kind: 'predefined', key: 'is_traction', label: '견인', visible: true, order: 4, color: 'orange' },
  { id: 'is_ion', kind: 'predefined', key: 'is_ion', label: '이온', visible: true, order: 5, color: 'emerald' },
  { id: 'is_exercise', kind: 'predefined', key: 'is_exercise', label: '운동', visible: true, order: 6, color: 'lime' },
];

const HANGUL_SYLLABLE_BASE = 0xac00;
const HANGUL_SYLLABLE_LAST = 0xd7a3;
const HANGUL_CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

const normalizeStatusMatchText = (value: string) =>
  value
    .normalize('NFC')
    .replace(/\s+/g, '')
    .toLocaleLowerCase();

const getChoseongText = (value: string) =>
  Array.from(value.normalize('NFC')).map((char) => {
    const code = char.charCodeAt(0);
    if (code >= HANGUL_SYLLABLE_BASE && code <= HANGUL_SYLLABLE_LAST) {
      return HANGUL_CHOSEONG[Math.floor((code - HANGUL_SYLLABLE_BASE) / 588)] || char;
    }
    return char;
  }).join('');

export const findStatusOptionMatch = (query: string, options: StatusOptionConfig[]) => {
  const normalizedQuery = normalizeStatusMatchText(query);
  if (!normalizedQuery) return null;

  const exactPrefixMatch = options.find((option) =>
    normalizeStatusMatchText(option.label).startsWith(normalizedQuery)
  );
  if (exactPrefixMatch) return exactPrefixMatch;

  const chosungQuery = normalizeStatusMatchText(getChoseongText(query));
  if (!chosungQuery) return null;

  return options.find((option) =>
    normalizeStatusMatchText(getChoseongText(option.label)).startsWith(chosungQuery)
  ) || null;
};

const sortStatusOptions = (options: StatusOptionConfig[]) => [...options].sort((a, b) => a.order - b.order);
const DEFAULT_STATUS_OPTION_MAP = new Map(DEFAULT_STATUS_OPTIONS.map((option) => [option.id, option] as const));
const PREDEFINED_STATUS_ID_SET = new Set(DEFAULT_STATUS_OPTIONS.map((option) => option.id));

const isStatusColorKey = (value: unknown): value is StatusColorKey =>
  typeof value === 'string' && value in STATUS_COLOR_OPTIONS;

export const normalizeStatusOptions = (options: StatusOptionConfig[]) =>
  [
    ...DEFAULT_STATUS_OPTIONS.map((defaultOption) => {
      const current = options.find((option) => (option.id || option.key) === defaultOption.id);
      return {
        ...defaultOption,
        ...current,
        id: current?.id || defaultOption.id,
        kind: 'predefined' as const,
        key: defaultOption.key,
        color: isStatusColorKey(current?.color) ? current.color : defaultOption.color,
      };
    }),
    ...options
      .filter((option) => {
        const normalizedId = option.id || option.key;
        return !!normalizedId && !PREDEFINED_STATUS_ID_SET.has(normalizedId);
      })
      .map((option, index) => ({
        id: option.id || `custom-${index}`,
        kind: 'custom' as const,
        key: option.key,
        label: option.label || `새 항목 ${index + 1}`,
        visible: option.visible ?? true,
        order: typeof option.order === 'number' ? option.order : DEFAULT_STATUS_OPTIONS.length + index,
        color: isStatusColorKey(option.color) ? option.color : 'pink',
      })),
  ].sort((a, b) => a.order - b.order)
    .map((option, order) => ({ ...option, order }));

const customStatusFromOption = (option: StatusOptionConfig): PatientCustomStatus => ({
  id: option.id,
  label: option.label,
  color: option.color,
  order: option.order,
});

export const StatusSelectionMenu: React.FC<StatusSelectionMenuProps> = ({
  visit,
  position,
  onClose,
  onToggle,
  title
}) => {
  const [statusOptions, setStatusOptions] = useLocalStorage<StatusOptionConfig[]>(STATUS_OPTIONS_STORAGE_KEY, DEFAULT_STATUS_OPTIONS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const normalizedStatusOptions = useMemo(() => normalizeStatusOptions(statusOptions), [statusOptions]);
  const orderedStatusOptions = useMemo(() => sortStatusOptions(normalizedStatusOptions), [normalizedStatusOptions]);
  const visibleStatusOptions = useMemo(() => orderedStatusOptions.filter((opt) => opt.visible), [orderedStatusOptions]);
  const hiddenStatusOptions = useMemo(() => orderedStatusOptions.filter((opt) => !opt.visible), [orderedStatusOptions]);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const initialIndex = useMemo(() => {
    const activeIdx = visibleStatusOptions.findIndex((opt) => {
      if (!visit) return false;
      if (opt.kind === 'predefined' && opt.key) return !!visit[opt.key];
      return !!visit.custom_statuses?.some((status) => status.id === opt.id);
    });
    return activeIdx >= 0 ? activeIdx : 0;
  }, [visibleStatusOptions, visit]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [typeaheadQuery, setTypeaheadQuery] = useState('');
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTypeaheadOptionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const next = new Set<string>();
    orderedStatusOptions.forEach((opt) => {
      if (opt.kind === 'predefined' && opt.key && visit?.[opt.key]) {
        next.add(opt.id);
      }
      if (opt.kind === 'custom' && visit?.custom_statuses?.some((status) => status.id === opt.id)) {
        next.add(opt.id);
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
    hiddenInputRef.current?.focus();
    const length = hiddenInputRef.current?.value.length ?? 0;
    hiddenInputRef.current?.setSelectionRange(length, length);
  }, [isSettingsOpen]);

  const resetTypeahead = useCallback(() => {
    pendingTypeaheadOptionIdRef.current = null;
    setTypeaheadQuery('');
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = '';
    }
    if (typeaheadTimerRef.current) {
      clearTimeout(typeaheadTimerRef.current);
      typeaheadTimerRef.current = null;
    }
  }, []);

  const toggleSelection = useCallback((index: number) => {
    const option = visibleStatusOptions[index];
    if (!option) return;
    pendingTypeaheadOptionIdRef.current = null;
    setActiveKeys((prev) => {
      const next = new Set(prev);
      if (next.has(option.id)) next.delete(option.id);
      else next.add(option.id);
      return next;
    });
    onToggle(option);
  }, [onToggle, visibleStatusOptions]);

  const updateStatusOption = useCallback((id: string, updater: (current: StatusOptionConfig) => StatusOptionConfig) => {
    setStatusOptions((prev) => normalizeStatusOptions(prev).map((opt) => opt.id === id ? updater(opt) : opt));
  }, [setStatusOptions]);

  const moveStatusOption = useCallback((id: string, direction: 'up' | 'down') => {
    setStatusOptions((prev) => {
      const ordered = normalizeStatusOptions(prev);
      const index = ordered.findIndex((opt) => opt.id === id);
      if (index < 0) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= ordered.length) return prev;

      const swapped = [...ordered];
      [swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]];
      return swapped.map((opt, order) => ({ ...opt, order }));
    });
  }, [setStatusOptions]);

  const addCustomStatusOption = useCallback(() => {
    setStatusOptions((prev) => {
      const normalized = normalizeStatusOptions(prev);
      const nextCustomIndex = normalized.filter((option) => option.kind === 'custom').length + 1;
      const nextOrder = normalized.length;
      return [
        ...normalized,
        {
          id: `custom-${crypto.randomUUID()}`,
          kind: 'custom',
          label: `새 항목 ${nextCustomIndex}`,
          visible: true,
          order: nextOrder,
          color: 'pink',
        },
      ];
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
        resetTypeahead();
        toggleSelection(activeIndex);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const pendingId = pendingTypeaheadOptionIdRef.current;
        if (pendingId) {
          const pendingIndex = visibleStatusOptions.findIndex((option) => option.id === pendingId);
          if (pendingIndex >= 0 && !activeKeys.has(pendingId)) {
            toggleSelection(pendingIndex);
          }
        }
        resetTypeahead();
        onClose();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        resetTypeahead();
        onClose();
        return;
      }

      if (e.key === 'Backspace' && typeaheadQuery) {
        e.preventDefault();
        e.stopPropagation();
        const nextQuery = typeaheadQuery.slice(0, -1);
        if (!nextQuery) {
          resetTypeahead();
          return;
        }
        setTypeaheadQuery(nextQuery);
        const matched = findStatusOptionMatch(nextQuery, visibleStatusOptions);
        if (matched) {
          const matchedIndex = visibleStatusOptions.findIndex((option) => option.id === matched.id);
          if (matchedIndex >= 0) {
            setActiveIndex(matchedIndex);
            pendingTypeaheadOptionIdRef.current = matched.id;
          }
        } else {
          pendingTypeaheadOptionIdRef.current = null;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeIndex, activeKeys, isSettingsOpen, onClose, resetTypeahead, toggleSelection, visibleStatusOptions]);

  useEffect(() => () => {
    if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
  }, []);

  return (
    <ContextMenu
      title={isSettingsOpen ? `${title} 설정` : title}
      position={position}
      onClose={onClose}
      width={isSettingsOpen ? 340 : 256}
      maxHeight={isSettingsOpen ? 'min(78vh, calc(100vh - 24px))' : 'min(70vh, calc(100vh - 24px))'}
      headerActions={(
        <>
          {isSettingsOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addCustomStatusOption();
              }}
              className="text-emerald-500 transition-colors hover:text-emerald-600 dark:hover:text-emerald-300"
              title="새 추가 사항 목록 추가"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className={`transition-colors ${isSettingsOpen ? 'text-sky-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            title="추가 사항 목록 설정"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </>
      )}
    >
      {isSettingsOpen ? (
        <div className="flex flex-col gap-4 min-h-0">
          <div className="flex flex-col gap-2">
            <div className="px-1 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              현재 목록
            </div>
            {visibleStatusOptions.length > 0 ? visibleStatusOptions.map((opt) => {
              const idx = orderedStatusOptions.findIndex((item) => item.id === opt.id);
              const palette = STATUS_COLOR_OPTIONS[opt.color] || STATUS_COLOR_OPTIONS.pink;
              return (
                <div key={opt.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/85 dark:bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={opt.label}
                      onChange={(e) => updateStatusOption(opt.id, (current) => ({ ...current, label: e.target.value }))}
                      className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[13px] font-black text-slate-800 dark:text-slate-100 outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={() => moveStatusOption(opt.id, 'up')}
                      disabled={idx === 0}
                      className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700"
                      title="위로 이동"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStatusOption(opt.id, 'down')}
                      disabled={idx === orderedStatusOptions.length - 1}
                      className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700"
                      title="아래로 이동"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${palette.button} ${palette.buttonText} shadow-sm`}>
                      {opt.label}
                    </div>
                    <div className="flex items-center gap-1">
                    {(Object.keys(STATUS_COLOR_OPTIONS) as StatusColorKey[]).map((colorKey) => {
                      const palette = STATUS_COLOR_OPTIONS[colorKey];
                      const isSelectedColor = opt.color === colorKey;
                      return (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => updateStatusOption(opt.id, (current) => ({ ...current, color: colorKey }))}
                          className={`relative h-6 w-6 rounded-full border-2 transition-transform hover:scale-105 ${palette.dot} ${isSelectedColor ? 'border-sky-400' : 'border-white dark:border-slate-800'}`}
                          title={`${opt.label} 색상 변경`}
                        >
                          {isSelectedColor && <Check className="mx-auto h-3.5 w-3.5 text-white drop-shadow" />}
                        </button>
                      );
                    })}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      현재 표시 중
                    </span>
                    <button
                      type="button"
                      onClick={() => updateStatusOption(opt.id, (current) => ({ ...current, visible: false }))}
                      className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                      삭제
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-4 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500">
                현재 표시 중인 항목이 없습니다.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="px-1 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              추가 가능한 항목
            </div>
            {hiddenStatusOptions.length > 0 ? hiddenStatusOptions.map((opt) => {
              const palette = STATUS_COLOR_OPTIONS[opt.color] || STATUS_COLOR_OPTIONS.pink;
              return (
              <div key={opt.id} className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/70 p-3 dark:border-emerald-800/60 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={opt.label}
                    onChange={(e) => updateStatusOption(opt.id, (current) => ({ ...current, label: e.target.value }))}
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[13px] font-black text-slate-800 dark:text-slate-100 outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={() => updateStatusOption(opt.id, (current) => ({ ...current, visible: true }))}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300"
                  >
                    <Plus className="w-3 h-3" />
                    추가
                  </button>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${palette.button} ${palette.buttonText} shadow-sm`}>
                    {opt.label}
                  </div>
                  <div className="flex items-center gap-1">
                  {(Object.keys(STATUS_COLOR_OPTIONS) as StatusColorKey[]).map((colorKey) => {
                    const palette = STATUS_COLOR_OPTIONS[colorKey];
                    const isSelectedColor = opt.color === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => updateStatusOption(opt.id, (current) => ({ ...current, color: colorKey }))}
                        className={`relative h-5 w-5 rounded-full border-2 transition-transform hover:scale-105 ${palette.dot} ${isSelectedColor ? 'border-sky-400' : 'border-white dark:border-slate-800'}`}
                        title={`${opt.label} 색상 변경`}
                      >
                        {isSelectedColor && <Check className="mx-auto h-3 w-3 text-white drop-shadow" />}
                      </button>
                    );
                  })}
                  </div>
                </div>
              </div>
            )}) : (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-4 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500">
                더 추가할 수 있는 항목이 없습니다.
              </div>
            )}
          </div>
        </div>
      ) : visibleStatusOptions.length > 0 ? (
        <div className="relative flex flex-col gap-1.5">
          <input
            ref={hiddenInputRef}
            onFocus={(e) => {
              const length = e.currentTarget.value.length;
              e.currentTarget.setSelectionRange(length, length);
            }}
            onChange={(e) => {
              const nextQuery = e.target.value;
              setTypeaheadQuery(nextQuery);
              const matched = findStatusOptionMatch(nextQuery, visibleStatusOptions);
              if (matched) {
                const matchedIndex = visibleStatusOptions.findIndex((option) => option.id === matched.id);
                if (matchedIndex >= 0) {
                  setActiveIndex(matchedIndex);
                  pendingTypeaheadOptionIdRef.current = matched.id;
                }
              } else {
                pendingTypeaheadOptionIdRef.current = null;
              }
              if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
              typeaheadTimerRef.current = setTimeout(() => {
                resetTypeahead();
              }, 900);
            }}
            onBlur={() => {
              if (!isSettingsOpen) {
                setTimeout(() => {
                  hiddenInputRef.current?.focus();
                  const length = hiddenInputRef.current?.value.length ?? 0;
                  hiddenInputRef.current?.setSelectionRange(length, length);
                }, 0);
              }
            }}
            className="pointer-events-none absolute left-0 top-0 h-0 w-0 opacity-0"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            defaultValue=""
            aria-hidden="true"
          />
        {visibleStatusOptions.map((opt, idx) => {
          const isActive = activeKeys.has(opt.id);
          const isFocusedOption = idx === activeIndex;
          const palette = STATUS_COLOR_OPTIONS[opt.color] || STATUS_COLOR_OPTIONS[DEFAULT_STATUS_OPTION_MAP.get(opt.id)?.color || 'sky'];
          const rowStyle = STATUS_MENU_ROW_STYLES[opt.color] || STATUS_MENU_ROW_STYLES.sky;
          return (
            <button
              key={opt.id}
              type="button"
              ref={(el) => {
                buttonRefs.current[idx] = el;
              }}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                setActiveIndex(idx);
                hiddenInputRef.current?.focus();
                toggleSelection(idx);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onTouchStart={() => setActiveIndex(idx)}
              className={`group flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-all text-[13px] font-black w-full ${
                isActive
                  ? `${palette.button} ${palette.buttonText} border-black/10 dark:border-white/10 shadow-sm`
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800/90'
              } ${isFocusedOption ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-slate-800' : ''}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${isActive ? 'bg-white/90' : rowStyle.accent}`} />
                <span className="truncate text-left leading-none">{opt.label}</span>
              </div>
              <div className="flex shrink-0 items-center">
                {isActive ? (
                  <Check className={`h-4 w-4 ${palette.buttonText}`} />
                ) : (
                  <div className={`h-2.5 w-2.5 rounded-full ${palette.dot} opacity-65`} />
                )}
              </div>
            </button>
          );
        })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
          표시할 추가 사항이 없습니다. 톱니 버튼에서 항목을 추가하세요.
        </div>
      )}
    </ContextMenu>
  );
};
