import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Check, X } from 'lucide-react';
import { PatientVisit, Preset } from '../../types';
import { TreatmentTextRenderer } from './TreatmentTextRenderer';
import { TreatmentControlButtons } from './TreatmentControlButtons';
import { useGridNavigation } from '../../hooks/useGridNavigation';
import { mapBgToTextClass } from '../../utils/styleUtils';
import { generateTreatmentString } from '../../utils/bedUtils';

interface TreatmentSelectorCellProps {
  visit?: PatientVisit;
  value: string;
  placeholder?: string;
  rowStatus?: 'active' | 'completed' | 'none';
  onCommitText: (val: string) => void;
  onOpenSelector: () => void;
  directSelector?: boolean;
  activeStepColor?: string;
  activeStepBgColor?: string;
  activeStepIndex?: number;
  isLastStep?: boolean;
  timerStatus?: 'normal' | 'warning' | 'overtime';
  remainingTime?: number;
  isPaused?: boolean;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  onClearBed?: () => void;
  onTogglePause?: () => void;
  onOpenTimerEdit?: (position: { x: number; y: number }) => void;
  enableStepInteraction?: boolean;
  quickTreatments?: import('../../types').QuickTreatment[];
  onDeleteStep?: (idx: number) => void;
  onMoveStep?: (idx: number, direction: 'left' | 'right') => void;
  onSwapSteps?: (fromIdx: number, toIdx: number) => void;
  onReplaceStep?: (idx: number, qt: import('../../types').QuickTreatment) => void;
  onOpenFullEditor?: () => void;
  onAddStep?: (qt: import('../../types').QuickTreatment) => void;
  gridId?: string;
  rowIndex: number;
  colIndex: number;
  isReadOnly?: boolean;
  presetLabel?: string;
  presetColor?: string;
  presetTextColor?: string;
  presetIsModified?: boolean;
  onDeletePresetBadge?: () => void;
  presets?: Preset[];
  onRenamePresetBadge?: (newPreset: Preset) => void;
  preferInlineTextEditing?: boolean;
}

export const TreatmentSelectorCell: React.FC<TreatmentSelectorCellProps> = ({
  visit,
  value,
  placeholder,
  rowStatus = 'none',
  onCommitText,
  onOpenSelector,
  activeStepColor,
  activeStepBgColor,
  activeStepIndex = -1,
  isLastStep = false,
  timerStatus = 'normal',
  remainingTime,
  isPaused,
  onNextStep,
  onPrevStep,
  onClearBed,
  onTogglePause,
  onOpenTimerEdit,
  enableStepInteraction = false,
  quickTreatments = [],
  onDeleteStep,
  onMoveStep,
  onSwapSteps,
  onReplaceStep,
  onOpenFullEditor,
  onAddStep,
  gridId,
  rowIndex,
  colIndex,
  isReadOnly = false,
  presetLabel,
  presetColor = 'bg-brand-500',
  presetTextColor,
  presetIsModified = false,
  onDeletePresetBadge,
  presets = [],
  onRenamePresetBadge,
  preferInlineTextEditing = false,
}) => {
  const cellRef = useRef<HTMLDivElement>(null);
  const [popupState, setPopupState] = useState<{ type: 'prev' | 'next' | 'clear'; x: number; y: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number } | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [isBadgeSelected, setIsBadgeSelected] = useState(false);
  const [badgeRenamePopup, setBadgeRenamePopup] = useState<{ x: number; y: number } | null>(null);
  const [emptyInputValue, setEmptyInputValue] = useState('');
  const [isEmptyEditing, setIsEmptyEditing] = useState(false);
  const [inlineInputValue, setInlineInputValue] = useState(value);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const lastTouchTimeRef = useRef<number>(0);
  const emptyInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const inlineCaretIndexRef = useRef<number | null>(null);
  const skipNextEmptyBlurCommitRef = useRef(false);
  const suppressNextSelectorOpenRef = useRef(false);
  const suppressInlineInteractionUntilRef = useRef(0);
  const inlineEnterStageRef = useRef(false);
  const suppressNextInlineSelectionFocusRef = useRef(false);
  const autoPresetAppliedAtRef = useRef(0);
  const { handleGridKeyDown } = useGridNavigation(11);
  const isInlineEditingTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest('[data-inline-treatment-editing="true"]');
  const isEditingInputTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest('input[data-inline-treatment-editing="true"]');

  const normalizePresetMatchText = (text: string) => text.trim().normalize('NFC').toLowerCase();
  const normalizePresetMatchTextDecomposed = (text: string) => text.trim().normalize('NFD').toLowerCase();

  const announceMatchedPreset = (preset: Preset | null) => {
    if (!visit?.id || !preset) return;
    window.dispatchEvent(new CustomEvent('patient-log-preset-badge-selected', {
      detail: { visitId: visit.id, preset }
    }));
  };

  const stepParts = useMemo(() => value.split('/').map((part) => part.trim()).filter(Boolean), [value]);
  const allowStepSelection = stepParts.length > 0;
  const isEmptyTreatmentCell = value.trim() === '' && !presetLabel;

  useEffect(() => {
    if (selectedStepIndex === null) return;
    if (selectedStepIndex >= stepParts.length) {
      setSelectedStepIndex(null);
    }
  }, [selectedStepIndex, stepParts.length]);

  useEffect(() => {
    if (!presetLabel && isBadgeSelected) {
      setIsBadgeSelected(false);
    }
  }, [presetLabel, isBadgeSelected]);

  useEffect(() => {
    if (!isEmptyTreatmentCell && emptyInputValue) {
      setEmptyInputValue('');
    }
  }, [emptyInputValue, isEmptyTreatmentCell]);

  useEffect(() => {
    if (!isEmptyTreatmentCell && isEmptyEditing) {
      setIsEmptyEditing(false);
    }
  }, [isEmptyTreatmentCell, isEmptyEditing]);

  useEffect(() => {
    setInlineInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!preferInlineTextEditing && isInlineEditing) {
      setIsInlineEditing(false);
    }
  }, [preferInlineTextEditing, isInlineEditing]);

  const isMobileOrTabletMode = () => window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches;

  const findPresetByQuery = (query: string) => {
    const normalized = normalizePresetMatchText(query);
    if (!normalized) return null;

    const leadingToken = normalized.split(/[()[\]\/,+\-\s]+/).find(Boolean) || normalized;
    const leadingTokenDecomposed = normalizePresetMatchTextDecomposed(leadingToken);
    const startsWithMatch = presets.find((preset) => preset.name.trim().toLowerCase().startsWith(leadingToken));
    if (startsWithMatch) return startsWithMatch;

    const decomposedStartsWithMatch = presets.find((preset) => normalizePresetMatchTextDecomposed(preset.name).startsWith(leadingTokenDecomposed));
    if (decomposedStartsWithMatch) return decomposedStartsWithMatch;

    const directStartsWithMatch = presets.find((preset) => normalizePresetMatchText(preset.name).startsWith(normalized));
    if (directStartsWithMatch) return directStartsWithMatch;

    return presets.find((preset) => {
      const presetName = normalizePresetMatchText(preset.name);
      const presetNameDecomposed = normalizePresetMatchTextDecomposed(preset.name);
      return presetName.includes(leadingToken) || presetNameDecomposed.includes(leadingTokenDecomposed);
    }) || null;
  };

  const shouldAutoApplyPresetFromText = (text: string) => /[(/)]/.test(text);


  const handleMouseEnter = () => {
    if (value && window.matchMedia('(min-width: 1024px) and (hover: hover)').matches && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setHoverInfo({ x: rect.left + (rect.width / 2), y: rect.top - 8 });
    }
  };

  const handleMouseLeave = () => setHoverInfo(null);

  const openSelector = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (suppressNextSelectorOpenRef.current) {
      suppressNextSelectorOpenRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    setHoverInfo(null);
    if (isBadgeSelected) {
      setIsBadgeSelected(false);
    }
    if (enableStepInteraction) {
      // 활성 행: 데스크탑 빈공간 클릭은 설정 수정창(풀 에디터), 모바일/태블릿은 처방 변경창 유지
      if (isMobileOrTabletMode()) {
        onOpenSelector();
      } else {
        onOpenFullEditor?.();
      }
      return;
    }
    // 비활성/완료 행은 클릭 시 처방 변경 창
    onOpenSelector();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const now = Date.now();
    const diff = now - lastTouchTimeRef.current;
    if (diff > 0 && diff < 350) {
      e.preventDefault();
      e.stopPropagation();
      setHoverInfo(null);
      if (isBadgeSelected) {
        setIsBadgeSelected(false);
      }
      if (enableStepInteraction) {
        onOpenSelector();
      } else {
        onOpenSelector();
      }
      lastTouchTimeRef.current = 0;
      return;
    }
    lastTouchTimeRef.current = now;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isInlineEditingTarget(e.target)) return;

    const pendingCaretIndex = inlineCaretIndexRef.current;
    const selectedGridHosts = document.querySelectorAll('[data-grid-id][data-grid-selection="true"]');
    const isMultiCellSelection = selectedGridHosts.length > 1;

    if (isEmptyTreatmentCell && !isReadOnly) {
      const nativeEvt = e.nativeEvent as KeyboardEvent & { keyCode?: number; which?: number };
      const isIMEKey = nativeEvt.isComposing || e.key === 'Process' || nativeEvt.keyCode === 229 || nativeEvt.which === 229;
      const isPlainTypingKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isIMEKey;

      if (isPlainTypingKey) {
        const nextValue = e.key;
        e.preventDefault();
        e.stopPropagation();
        flushSync(() => {
          setIsEmptyEditing(true);
          setEmptyInputValue(nextValue);
        });
        requestAnimationFrame(() => {
          emptyInputRef.current?.focus();
          const end = nextValue.length;
          emptyInputRef.current?.setSelectionRange(end, end);
        });
        return;
      }
    }

    if (preferInlineTextEditing && !isReadOnly && (e.key === 'Backspace' || e.key === 'Delete') && pendingCaretIndex !== null) {
      e.preventDefault();
      e.stopPropagation();

      const baseValue = isInlineEditing ? inlineInputValue : value;
      if (e.key === 'Backspace') {
        if (pendingCaretIndex <= 0) return;
        const nextValue = baseValue.slice(0, pendingCaretIndex - 1) + baseValue.slice(pendingCaretIndex);
        const nextCaret = pendingCaretIndex - 1;
        setInlineInputValue(nextValue);
        setIsInlineEditing(true);
        inlineCaretIndexRef.current = nextCaret;
        requestAnimationFrame(() => {
          inlineInputRef.current?.focus();
          inlineInputRef.current?.setSelectionRange(nextCaret, nextCaret);
        });
        return;
      }

      if (pendingCaretIndex >= baseValue.length) return;
      const nextValue = baseValue.slice(0, pendingCaretIndex) + baseValue.slice(pendingCaretIndex + 1);
      setInlineInputValue(nextValue);
      setIsInlineEditing(true);
      inlineCaretIndexRef.current = pendingCaretIndex;
      requestAnimationFrame(() => {
        inlineInputRef.current?.focus();
        inlineInputRef.current?.setSelectionRange(pendingCaretIndex, pendingCaretIndex);
      });
      return;
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && !isReadOnly && !isMultiCellSelection) {
      e.preventDefault();
      e.stopPropagation();
      if (isBadgeSelected && onDeletePresetBadge) {
        onDeletePresetBadge();
        setIsBadgeSelected(false);
      } else if (value.trim() !== '') {
        onDeletePresetBadge?.();
        setIsBadgeSelected(false);
        onCommitText('');
      }
      return;
    }

    const nativeEvt = e.nativeEvent as KeyboardEvent & { keyCode?: number; which?: number };
    const isIMEKey = nativeEvt.isComposing || e.key === 'Process' || nativeEvt.keyCode === 229 || nativeEvt.which === 229;
    const isPlainTypingKey = (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) || isIMEKey;

    if (preferInlineTextEditing && !isReadOnly && isPlainTypingKey) {
      if (isIMEKey) {
        flushSync(() => {
          setInlineInputValue(value);
          setIsInlineEditing(true);
        });
        requestAnimationFrame(() => {
          inlineInputRef.current?.focus();
          const caretIndex = inlineCaretIndexRef.current ?? (inlineInputRef.current?.value.length ?? 0);
          inlineCaretIndexRef.current = caretIndex;
          inlineInputRef.current?.setSelectionRange(caretIndex, caretIndex);
        });
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (pendingCaretIndex !== null) {
        const baseValue = isInlineEditing ? inlineInputValue : value;
        const nextValue = baseValue.slice(0, pendingCaretIndex) + e.key + baseValue.slice(pendingCaretIndex);
        const nextCaret = pendingCaretIndex + 1;
        setInlineInputValue(nextValue);
        setIsInlineEditing(true);
        inlineCaretIndexRef.current = nextCaret;
        requestAnimationFrame(() => {
          inlineInputRef.current?.focus();
          inlineInputRef.current?.setSelectionRange(nextCaret, nextCaret);
        });
        return;
      }

      const nextValue = e.key;
      setInlineInputValue(nextValue);
      setIsInlineEditing(true);
      requestAnimationFrame(() => {
        inlineInputRef.current?.focus();
        const end = nextValue.length;
        inlineCaretIndexRef.current = end;
        inlineInputRef.current?.setSelectionRange(end, end);
      });
      return;
    }

    if (e.key === 'Enter') {
      if (suppressNextSelectorOpenRef.current) {
        suppressNextSelectorOpenRef.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      openSelector(e);
    } else {
      handleGridKeyDown(e, rowIndex, colIndex);
    }
  };

  const handleEmptyInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isEmptyEditing) {
      const nativeEvt = e.nativeEvent as KeyboardEvent & { keyCode?: number; which?: number };
      const isIMEKey = nativeEvt.isComposing || e.key === 'Process' || nativeEvt.keyCode === 229 || nativeEvt.which === 229;
      const isPlainTypingKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isIMEKey;

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        openSelector(e);
        return;
      }

      if (e.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        return;
      }

      if (isPlainTypingKey) {
        e.preventDefault();
        e.stopPropagation();
        beginEmptyTyping(e.key);
        return;
      }

      if (isIMEKey) {
        e.stopPropagation();
        flushSync(() => {
          setIsEmptyEditing(true);
          setEmptyInputValue('');
        });
        requestAnimationFrame(() => {
          emptyInputRef.current?.focus();
        });
        return;
      }

      handleGridKeyDown(e, rowIndex, colIndex, false, emptyInputRef.current);
      return;
    }

    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const matchedPreset = commitEmptyInputValue();
      if (matchedPreset) {
        window.setTimeout(() => {
          cellRef.current?.focus();
        }, 0);
      } else {
        requestAnimationFrame(() => cellRef.current?.focus());
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEmptyInputValue('');
      setIsEmptyEditing(false);
      requestAnimationFrame(() => cellRef.current?.focus());
      return;
    }

    handleGridKeyDown(e, rowIndex, colIndex, true, emptyInputRef.current);
  };

  const commitEmptyInputValue = () => {
    const rawValue = emptyInputRef.current?.value ?? emptyInputValue;
    const normalized = rawValue.trim();
    if (!normalized) {
      setEmptyInputValue('');
      setIsEmptyEditing(false);
      return false;
    }

    const matchedPreset = findPresetByQuery(normalized);
    const nextValue = matchedPreset ? generateTreatmentString(matchedPreset.steps) : normalized;
    skipNextEmptyBlurCommitRef.current = true;
    suppressNextSelectorOpenRef.current = !!matchedPreset;
    if (matchedPreset) {
      announceMatchedPreset(matchedPreset);
      suppressInlineInteractionUntilRef.current = Date.now() + 120;
    }
    emptyInputRef.current?.blur();
    onCommitText(nextValue);
    setEmptyInputValue('');
    setIsEmptyEditing(false);
    if (matchedPreset) {
      window.setTimeout(() => {
        suppressNextSelectorOpenRef.current = false;
      }, 0);
    }
    return !!matchedPreset;
  };

  const commitInlineInputValue = () => {
    const rawValue = inlineInputRef.current?.value ?? inlineInputValue;
    const normalized = rawValue.trim();
    const matchedPreset = findPresetByQuery(normalized);
    const nextValue = matchedPreset ? generateTreatmentString(matchedPreset.steps) : normalized;
    if (nextValue !== value.trim()) {
      announceMatchedPreset(matchedPreset);
      onCommitText(nextValue);
    }
    setInlineInputValue(nextValue);
    inlineEnterStageRef.current = false;
    inlineCaretIndexRef.current = null;
    setIsInlineEditing(false);
  };

  useEffect(() => {
    if (!isEmptyEditing) return;
    if (!shouldAutoApplyPresetFromText(emptyInputValue)) return;

    const matchedPreset = findPresetByQuery(emptyInputValue);
    if (!matchedPreset) return;

    const nextValue = generateTreatmentString(matchedPreset.steps);
    autoPresetAppliedAtRef.current = Date.now();
    skipNextEmptyBlurCommitRef.current = true;
    suppressNextSelectorOpenRef.current = true;
    announceMatchedPreset(matchedPreset);
    onCommitText(nextValue);
    setEmptyInputValue('');
    setIsEmptyEditing(false);
    requestAnimationFrame(() => {
      cellRef.current?.focus();
    });
  }, [emptyInputValue, isEmptyEditing]);

  useEffect(() => {
    if (!isInlineEditing) return;
    if (!shouldAutoApplyPresetFromText(inlineInputValue)) return;

    const matchedPreset = findPresetByQuery(inlineInputValue);
    if (!matchedPreset) return;

    const nextValue = generateTreatmentString(matchedPreset.steps);
    autoPresetAppliedAtRef.current = Date.now();
    suppressNextSelectorOpenRef.current = true;
    announceMatchedPreset(matchedPreset);
    onCommitText(nextValue);
    inlineEnterStageRef.current = false;
    inlineCaretIndexRef.current = null;
    setInlineInputValue(nextValue);
    setIsInlineEditing(false);
    suppressNextInlineSelectionFocusRef.current = true;
    requestAnimationFrame(() => {
      cellRef.current?.focus();
    });
  }, [inlineInputValue, isInlineEditing]);

  const finalizeInlineEditing = () => {
    commitInlineInputValue();
    suppressNextInlineSelectionFocusRef.current = true;
    requestAnimationFrame(() => {
      cellRef.current?.focus();
    });
  };

  const getCaretIndexFromClick = (text: string, sourceEl: HTMLElement, clientX: number) => {
    if (!text) return 0;

    const rect = sourceEl.getBoundingClientRect();
    const computed = window.getComputedStyle(sourceEl);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return text.length;

    context.font = computed.font;
    const localX = Math.max(0, clientX - rect.left);

    for (let index = 0; index < text.length; index += 1) {
      const leftWidth = context.measureText(text.slice(0, index)).width;
      const rightWidth = context.measureText(text.slice(0, index + 1)).width;
      const midpoint = leftWidth + (rightWidth - leftWidth) / 2;
      if (localX <= midpoint) {
        return index;
      }
    }

    return text.length;
  };

  const isPointWithinRenderedText = (text: string, sourceEl: HTMLElement, clientX: number) => {
    if (!text.trim()) return false;

    const rect = sourceEl.getBoundingClientRect();
    const computed = window.getComputedStyle(sourceEl);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return true;

    context.font = computed.font;
    const localX = Math.max(0, clientX - rect.left);
    const textWidth = context.measureText(text).width;
    return localX <= textWidth + 4;
  };

  const startInlineEditing = (clientX?: number, sourceEl?: HTMLElement | null) => {
    if (!preferInlineTextEditing || isReadOnly) return;
    setInlineInputValue(value);
    setIsInlineEditing(true);
    requestAnimationFrame(() => {
      inlineInputRef.current?.focus();
      const caretIndex = typeof clientX === 'number' && sourceEl
        ? getCaretIndexFromClick(value, sourceEl, clientX)
        : value.length;
      inlineCaretIndexRef.current = caretIndex;
      inlineInputRef.current?.setSelectionRange(caretIndex, caretIndex);
    });
  };

  const beginInlineTyping = (nextValue: string) => {
    flushSync(() => {
      setInlineInputValue(nextValue);
      setIsInlineEditing(true);
    });
    requestAnimationFrame(() => {
      inlineInputRef.current?.focus();
      const end = nextValue.length;
      inlineCaretIndexRef.current = end;
      inlineInputRef.current?.setSelectionRange(end, end);
    });
  };

  const beginEmptyTyping = (nextValue: string) => {
    flushSync(() => {
      setIsEmptyEditing(true);
      setEmptyInputValue(nextValue);
    });
    requestAnimationFrame(() => {
      emptyInputRef.current?.focus();
      const end = nextValue.length;
      emptyInputRef.current?.setSelectionRange(end, end);
    });
  };

  const focusEmptySelection = () => {
    requestAnimationFrame(() => {
      const input = emptyInputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(0, 0);
    });
  };

  const focusInlineSelection = () => {
    requestAnimationFrame(() => {
      const input = inlineInputRef.current;
      if (!input) return;
      input.focus();
      const end = input.value.length;
      inlineCaretIndexRef.current = end;
      input.setSelectionRange(end, end);
    });
  };

  const handleCompositionStartCapture = (e: React.CompositionEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
    if (isEditingInputTarget(e.target)) return;

    if (isEmptyTreatmentCell) {
      flushSync(() => {
        setIsEmptyEditing(true);
        setEmptyInputValue('');
      });
      requestAnimationFrame(() => {
        emptyInputRef.current?.focus();
      });
      return;
    }

    if (preferInlineTextEditing && !isInlineEditing) {
      flushSync(() => {
        setInlineInputValue(value);
        setIsInlineEditing(true);
      });
      requestAnimationFrame(() => {
        inlineInputRef.current?.focus();
        const caretIndex = inlineCaretIndexRef.current ?? (inlineInputRef.current?.value.length ?? 0);
        inlineCaretIndexRef.current = caretIndex;
        inlineInputRef.current?.setSelectionRange(caretIndex, caretIndex);
      });
    }
  };

  const handleCompositionEndCapture = (e: React.CompositionEvent<HTMLDivElement>) => {
    if (isReadOnly || isEditingInputTarget(e.target)) return;

    const composed = e.data ?? '';
    if (!composed) return;

    if (isEmptyTreatmentCell) {
      beginEmptyTyping(composed);
      return;
    }

    if (preferInlineTextEditing) {
      beginInlineTyping(composed);
    }
  };

  const handleBeforeInputCapture = (e: React.FormEvent<HTMLDivElement>) => {
    if (isReadOnly || isEditingInputTarget(e.target)) return;

    const nativeEvent = e.nativeEvent as InputEvent;
    if (nativeEvent.isComposing || nativeEvent.inputType.includes('Composition')) return;
    const text = nativeEvent.data ?? '';
    if (!text) return;

    if (!nativeEvent.inputType.startsWith('insert')) return;

    e.preventDefault();
    e.stopPropagation();

    if (isEmptyTreatmentCell) {
      beginEmptyTyping(text);
      return;
    }

    if (preferInlineTextEditing && !isInlineEditing) {
      beginInlineTyping(text);
    }
  };

  const handleInlineInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (Date.now() < suppressInlineInteractionUntilRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (!isInlineEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        inlineEnterStageRef.current = true;
        setInlineInputValue(value);
        setIsInlineEditing(true);
        requestAnimationFrame(() => {
          const input = inlineInputRef.current;
          if (!input) return;
          input.focus();
          const end = input.value.length;
          inlineCaretIndexRef.current = end;
          input.setSelectionRange(end, end);
        });
        return;
      }

      if (e.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedGridHosts = document.querySelectorAll('[data-grid-id][data-grid-selection="true"]');
        const isMultiCellSelection = selectedGridHosts.length > 1;
        if (isMultiCellSelection) return;

        e.preventDefault();
        e.stopPropagation();
        onDeletePresetBadge?.();
        setIsBadgeSelected(false);
        onCommitText('');
        return;
      }

      handleGridKeyDown(e, rowIndex, colIndex, false, inlineInputRef.current);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const shouldOpenSelector = inlineEnterStageRef.current && inlineInputValue.trim() === value.trim();
      finalizeInlineEditing();
      if (shouldOpenSelector) {
        requestAnimationFrame(() => {
          onOpenSelector();
        });
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      inlineEnterStageRef.current = false;
      finalizeInlineEditing();
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.stopPropagation();
      return;
    }

    handleGridKeyDown(e, rowIndex, colIndex, true, inlineInputRef.current);
  };

  const handleStepButtonClick = (e: React.MouseEvent, type: 'prev' | 'next' | 'clear') => {
    e.stopPropagation();
    setHoverInfo(null);

    const isDesktopOrTablet = window.matchMedia('(min-width: 768px)').matches;
    if (isDesktopOrTablet) {
      if (type === 'next' && onNextStep) onNextStep();
      else if (type === 'prev' && onPrevStep) onPrevStep();
      else if (type === 'clear' && onClearBed) onClearBed();
    } else {
      setPopupState({ type, x: e.clientX, y: e.clientY });
    }
  };

  const executeStepAction = () => {
    if (popupState?.type === 'next' && onNextStep) onNextStep();
    else if (popupState?.type === 'prev' && onPrevStep) onPrevStep();
    else if (popupState?.type === 'clear' && onClearBed) onClearBed();
    setPopupState(null);
  };

  const getPopupMessage = () => {
    switch (popupState?.type) {
      case 'prev':
        return '이전 단계로?';
      case 'next':
        return isLastStep ? '치료 완료/비우기?' : '다음 단계로?';
      case 'clear':
        return '배드 비우기?';
      default:
        return '';
    }
  };

  const handleMoveSelectedStep = (direction: 'left' | 'right') => {
    if (selectedStepIndex === null) return;
    const target = direction === 'left' ? selectedStepIndex - 1 : selectedStepIndex + 1;
    if (target < 0 || target >= stepParts.length) return;
    onMoveStep?.(selectedStepIndex, direction);
    setSelectedStepIndex(target);
  };

  const handleDeleteSelectedStep = () => {
    if (selectedStepIndex === null) return;
    onDeleteStep?.(selectedStepIndex);
    setSelectedStepIndex(null);
  };

  const getTitle = () => (value ? '더블클릭하여 세트 처방 선택' : '더블클릭하여 처방 선택');
  const presetBadgeTextClass = presetIsModified
    ? 'text-yellow-200'
    : (presetTextColor || 'text-white');

  return (
    <>
      <div
        ref={cellRef}
        tabIndex={0}
        data-grid-id={gridId}
        onFocusCapture={(e) => {
          if (isInlineEditingTarget(e.target)) return;
          if (isEmptyTreatmentCell && !isReadOnly) {
            focusEmptySelection();
            return;
          }
          if (preferInlineTextEditing && !isEmptyTreatmentCell && !isReadOnly) {
            if (suppressNextInlineSelectionFocusRef.current) {
              suppressNextInlineSelectionFocusRef.current = false;
            }
            inlineCaretIndexRef.current = null;
          }
        }}
        onMouseDownCapture={(e) => {
          if (e.button !== 0) return;
          if (isInlineEditingTarget(e.target)) return;
          if (isEmptyTreatmentCell && !isReadOnly) {
            focusEmptySelection();
            return;
          }
          if (preferInlineTextEditing && !isEmptyTreatmentCell && !isReadOnly) {
            cellRef.current?.focus();
            return;
          }
          if (!isEmptyTreatmentCell || isReadOnly) {
            cellRef.current?.focus();
          }
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if (isInlineEditingTarget(e.target)) return;
          if (isEmptyTreatmentCell && !isReadOnly) {
            focusEmptySelection();
            return;
          }
          if (preferInlineTextEditing && !isEmptyTreatmentCell && !isReadOnly) {
            cellRef.current?.focus();
            return;
          }
          cellRef.current?.focus();
        }}
        onClick={(e) => {
          if (isInlineEditingTarget(e.target)) return;
          if (isEmptyTreatmentCell && !isReadOnly) {
            focusEmptySelection();
            return;
          }
          if (preferInlineTextEditing && !isEmptyTreatmentCell && !isReadOnly) {
            cellRef.current?.focus();
            return;
          }
          cellRef.current?.focus();
        }}
        onDoubleClick={openSelector}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={handleKeyDown}
        onBeforeInputCapture={handleBeforeInputCapture}
        onCompositionStartCapture={handleCompositionStartCapture}
        onCompositionEndCapture={handleCompositionEndCapture}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-[calc(100%-4px)] h-[calc(100%-4px)] m-[2px] min-h-[28px] relative rounded-[1px] outline-none focus:outline-none focus-within:outline-none focus:z-10 focus-within:z-10 focus:bg-sky-500/5 focus-within:bg-sky-500/5 focus:shadow-[inset_0_0_0_2px_rgb(14_165_233)] focus-within:shadow-[inset_0_0_0_2px_rgb(14_165_233)]"
      >
        <div
          className={`flex items-center w-full h-full px-2 transition-colors relative ${isReadOnly ? 'cursor-not-allowed bg-gray-50/80 dark:bg-slate-800/40' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30'} rounded-[1px]`}
          title={getTitle()}
        >
          <div className="flex-1 min-w-0 h-full flex items-center justify-start pl-2 pr-[4px] py-0 gap-1.5">
            {presetLabel && (
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBadgeSelected(prev => !prev);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isBadgeSelected && presets.length > 0) {
                    setBadgeRenamePopup({ x: e.clientX, y: e.clientY });
                  }
                }}
                className={`shrink-0 px-2 py-0.5 rounded-md text-[14.3px] font-black ${presetColor} ${presetBadgeTextClass} border ${isBadgeSelected ? 'border-sky-500 outline outline-2 outline-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]' : 'border-black/10 dark:border-white/10'} cursor-pointer transition-all`}
              >
                {presetLabel}
              </span>
            )}
            <div className={`text-[16.5px] sm:text-[17.6px] xl:text-[16.5px] font-semibold text-left w-full leading-normal text-slate-900 dark:text-slate-100 flex items-center min-h-[28px] ${(allowStepSelection || isEmptyTreatmentCell || preferInlineTextEditing) ? 'pointer-events-auto' : 'pointer-events-none'}`}>
              {isEmptyTreatmentCell && !isReadOnly ? (
                <input
                  key="empty-treatment-input"
                  ref={emptyInputRef}
                  data-inline-treatment-editing="true"
                  data-direct-editing={isEmptyEditing ? 'true' : 'false'}
                  value={isEmptyEditing ? emptyInputValue : ''}
                  onChange={(e) => {
                    if (!isEmptyEditing) {
                      setIsEmptyEditing(true);
                    }
                    setEmptyInputValue(e.target.value);
                  }}
                  onBeforeInput={(e) => {
                    const nativeEvent = e.nativeEvent as InputEvent;
                    if (!isEmptyEditing && !nativeEvent.isComposing && nativeEvent.inputType.startsWith('insert')) {
                      setIsEmptyEditing(true);
                    }
                  }}
                  onCompositionStart={() => {
                    if (!isEmptyEditing) {
                      setIsEmptyEditing(true);
                    }
                  }}
                  onKeyDown={handleEmptyInputKeyDown}
                  onBlur={() => {
                    if (skipNextEmptyBlurCommitRef.current) {
                      skipNextEmptyBlurCommitRef.current = false;
                      setIsEmptyEditing(false);
                      setEmptyInputValue('');
                      return;
                    }
                    commitEmptyInputValue();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full bg-transparent outline-none border-none text-[16.5px] sm:text-[17.6px] xl:text-[16.5px] font-semibold text-left text-slate-900 dark:text-slate-100 placeholder:text-gray-400 ${isEmptyEditing ? 'caret-auto cursor-text' : 'caret-transparent cursor-default select-none'}`}
                  placeholder={placeholder}
                />
              ) : preferInlineTextEditing && !isReadOnly ? (
                <input
                  key="inline-treatment-input"
                  ref={inlineInputRef}
                  data-inline-treatment-editing="true"
                  data-direct-editing={isInlineEditing ? 'true' : 'false'}
                  value={isInlineEditing ? inlineInputValue : value}
                  onChange={(e) => {
                    if (Date.now() < suppressInlineInteractionUntilRef.current) {
                      return;
                    }
                    inlineEnterStageRef.current = false;
                    if (!isInlineEditing) {
                      setIsInlineEditing(true);
                    }
                    setInlineInputValue(e.target.value);
                  }}
                  onBeforeInput={(e) => {
                    if (Date.now() < suppressInlineInteractionUntilRef.current) {
                      e.preventDefault();
                      return;
                    }
                    const nativeEvent = e.nativeEvent as InputEvent;
                    if (!isInlineEditing && nativeEvent.inputType.startsWith('insert')) {
                      inlineEnterStageRef.current = false;
                      setInlineInputValue(value);
                      setIsInlineEditing(true);
                    }
                  }}
                  onCompositionStart={() => {
                    if (Date.now() < suppressInlineInteractionUntilRef.current) {
                      return;
                    }
                    inlineEnterStageRef.current = false;
                    if (!isInlineEditing) {
                      setInlineInputValue(value);
                      setIsInlineEditing(true);
                    }
                  }}
                  onKeyDown={handleInlineInputKeyDown}
                  onBlur={commitInlineInputValue}
                  onSelect={() => {
                    inlineCaretIndexRef.current = inlineInputRef.current?.selectionStart ?? null;
                  }}
                  onKeyUp={() => {
                    inlineCaretIndexRef.current = inlineInputRef.current?.selectionStart ?? null;
                  }}
                  onMouseUp={() => {
                    inlineCaretIndexRef.current = inlineInputRef.current?.selectionStart ?? null;
                  }}
                  onMouseDown={(e) => {
                    if (!isInlineEditing) {
                      if (!isPointWithinRenderedText(value, e.currentTarget, e.clientX)) {
                        e.preventDefault();
                        e.stopPropagation();
                        inlineCaretIndexRef.current = null;
                        cellRef.current?.focus();
                        return;
                      }
                      e.preventDefault();
                      e.stopPropagation();
                      startInlineEditing(e.clientX, e.currentTarget);
                      return;
                    }
                    e.stopPropagation();
                  }}
                  onTouchStart={(e) => {
                    if (!isInlineEditing) {
                      const touch = e.touches[0];
                      if (touch && !isPointWithinRenderedText(value, e.currentTarget, touch.clientX)) {
                        e.stopPropagation();
                        inlineCaretIndexRef.current = null;
                        cellRef.current?.focus();
                        return;
                      }
                      e.stopPropagation();
                      startInlineEditing(touch?.clientX, e.currentTarget);
                      return;
                    }
                    e.stopPropagation();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full bg-transparent outline-none border-none text-[16.5px] sm:text-[17.6px] xl:text-[16.5px] font-semibold text-left text-slate-900 dark:text-slate-100 placeholder:text-gray-400 ${isInlineEditing ? 'caret-auto cursor-text' : 'caret-transparent cursor-default select-none'}`}
                  placeholder={placeholder}
                />
              ) : (
                <TreatmentTextRenderer
                  value={value}
                  placeholder={placeholder}
                  isActiveRow={rowStatus === 'active'}
                  activeStepIndex={activeStepIndex}
                  activeStepColor={activeStepColor}
                  activeStepBgColor={activeStepBgColor}
                  timerStatus={timerStatus}
                  remainingTime={remainingTime}
                  isPaused={isPaused}
                  onTogglePause={onTogglePause}
                  onOpenTimerEdit={onOpenTimerEdit}
                  interactiveStepEdit={enableStepInteraction}
                  allowStepSelection={allowStepSelection}
                  quickTreatments={quickTreatments}
                  onDeleteStep={onDeleteStep}
                  onMoveStep={onMoveStep}
                  onSwapSteps={onSwapSteps}
                  onReplaceStep={onReplaceStep}
                  onOpenFullEditor={onOpenFullEditor}
                  selectedStepIndex={selectedStepIndex}
                  onSelectedStepIndexChange={setSelectedStepIndex}
                />
              )}
            </div>
          </div>

          {isReadOnly && (
            <span className="absolute top-1 right-2 rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-200">
              타이머 사용
            </span>
          )}

          {!isReadOnly && (
            <TreatmentControlButtons
              rowStatus={rowStatus}
              activeStepIndex={activeStepIndex}
              isLastStep={isLastStep}
              onNextStep={onNextStep}
              onPrevStep={onPrevStep}
              onClearBed={onClearBed}
              onAddStep={onAddStep}
              quickTreatments={quickTreatments}
              onActionClick={handleStepButtonClick}
              selectedStepIndex={selectedStepIndex}
              stepCount={stepParts.length}
              onDeleteSelectedStep={handleDeleteSelectedStep}
              onMoveSelectedStep={handleMoveSelectedStep}
            />
          )}
        </div>
      </div>

      {hoverInfo && createPortal(
        <div
          className="fixed z-[9999] bg-[#f2f2f2] dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-150 max-w-sm border border-gray-200 dark:border-slate-700"
          style={{ top: hoverInfo.y, left: hoverInfo.x, transform: 'translate(-50%, -100%)' }}
        >
          <div className="text-sm font-semibold text-left leading-relaxed max-w-[420px] whitespace-pre-wrap">{value || placeholder}</div>
          <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#f2f2f2] dark:bg-slate-800 rotate-45 transform border-b border-r border-gray-200 dark:border-slate-700"></div>
        </div>,
        document.body
      )}

      {popupState && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setPopupState(null)}>
          <div
            className="absolute bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-600 p-2 animate-in zoom-in-95 duration-150 origin-bottom"
            style={{ top: popupState.y - 70, left: popupState.x - 70, width: 140 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold text-center text-gray-600 dark:text-gray-300 mb-1.5 whitespace-nowrap">{getPopupMessage()}</p>
            <div className="flex gap-1">
              <button
                onClick={executeStepAction}
                className={`flex-1 py-1 text-white rounded text-[10px] font-bold flex items-center justify-center gap-0.5 ${popupState.type === 'clear' || (popupState.type === 'next' && isLastStep) ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'}`}
              >
                <Check className="w-3 h-3" /> 예
              </button>
              <button
                onClick={() => setPopupState(null)}
                className="flex-1 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded text-[10px] font-bold hover:bg-gray-200 flex items-center justify-center gap-0.5"
              >
                <X className="w-3 h-3" /> 취소
              </button>
            </div>
            <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white dark:bg-slate-800 border-b border-r border-gray-200 dark:border-slate-600 rotate-45 transform"></div>
          </div>
        </div>,
        document.body
      )}

      {badgeRenamePopup && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setBadgeRenamePopup(null)}>
          <div
            className="absolute bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150 origin-top-left flex flex-col"
            style={{ top: badgeRenamePopup.y, left: badgeRenamePopup.x, width: 220, maxHeight: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 shrink-0">
              <span className="font-bold text-gray-800 dark:text-white text-xs">세트 이름 변경</span>
            </div>
            <div className="p-1.5 flex flex-col gap-0.5 overflow-y-auto max-h-[260px]">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onRenamePresetBadge?.(p);
                    setBadgeRenamePopup(null);
                    setIsBadgeSelected(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold transition-colors flex items-center gap-2 ${
                    p.name === presetLabel
                      ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full shrink-0 ${p.color || 'bg-gray-400'}`} />
                  {p.name}
                  {p.name === presetLabel && <Check className="w-3.5 h-3.5 ml-auto text-sky-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
