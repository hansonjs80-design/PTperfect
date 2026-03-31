import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [inlineInputValue, setInlineInputValue] = useState(value);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const lastTouchTimeRef = useRef<number>(0);
  const emptyInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const { handleGridKeyDown } = useGridNavigation(11);

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
    setInlineInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!preferInlineTextEditing && isInlineEditing) {
      setIsInlineEditing(false);
    }
  }, [preferInlineTextEditing, isInlineEditing]);

  const isMobileOrTabletMode = () => window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches;

  const findPresetByQuery = (query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return null;

    const startsWithMatch = presets.find((preset) => preset.name.trim().toLowerCase().startsWith(normalized));
    if (startsWithMatch) return startsWithMatch;

    return presets.find((preset) => preset.name.trim().toLowerCase().includes(normalized)) || null;
  };


  const handleMouseEnter = () => {
    if (value && window.matchMedia('(min-width: 1024px) and (hover: hover)').matches && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setHoverInfo({ x: rect.left + (rect.width / 2), y: rect.top - 8 });
    }
  };

  const handleMouseLeave = () => setHoverInfo(null);

  const openSelector = (e: React.MouseEvent | React.KeyboardEvent) => {
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
    if ((e.key === 'Delete' || e.key === 'Backspace') && !isReadOnly) {
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
      e.preventDefault();
      e.stopPropagation();

      if (isIMEKey) {
        setIsInlineEditing(true);
        requestAnimationFrame(() => {
          inlineInputRef.current?.focus();
          const end = inlineInputRef.current?.value.length ?? 0;
          inlineInputRef.current?.setSelectionRange(end, end);
        });
        return;
      }

      const nextValue = e.key;
      setInlineInputValue(nextValue);
      setIsInlineEditing(true);
      requestAnimationFrame(() => {
        inlineInputRef.current?.focus();
        const end = nextValue.length;
        inlineInputRef.current?.setSelectionRange(end, end);
      });
      return;
    }

    if (e.key === 'Enter') {
      openSelector(e);
    } else {
      handleGridKeyDown(e, rowIndex, colIndex);
    }
  };

  const handleEmptyInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      const query = emptyInputValue.trim();
      if (!query) {
        openSelector(e);
        return;
      }

      const matchedPreset = findPresetByQuery(query);
      if (!matchedPreset) return;

      onCommitText(generateTreatmentString(matchedPreset.steps));
      setEmptyInputValue('');
      requestAnimationFrame(() => cellRef.current?.focus());
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEmptyInputValue('');
      requestAnimationFrame(() => cellRef.current?.focus());
      return;
    }

    const nativeEvt = e.nativeEvent as KeyboardEvent & { keyCode?: number; which?: number };
    const isIMEKey = nativeEvt.isComposing || e.key === 'Process' || nativeEvt.keyCode === 229 || nativeEvt.which === 229;
    const isPlainTypingKey = (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) || isIMEKey;
    if (isPlainTypingKey) {
      e.preventDefault();
      e.stopPropagation();
      const nextValue = isIMEKey ? '' : e.key;
      setEmptyInputValue(nextValue);
      requestAnimationFrame(() => {
        emptyInputRef.current?.focus();
        const end = nextValue.length;
        emptyInputRef.current?.setSelectionRange(end, end);
      });
      return;
    }

    handleGridKeyDown(e, rowIndex, colIndex, true, emptyInputRef.current);
  };

  const commitInlineInputValue = () => {
    const normalized = inlineInputValue.trim();
    const matchedPreset = findPresetByQuery(normalized);
    const nextValue = matchedPreset ? generateTreatmentString(matchedPreset.steps) : normalized;
    if (nextValue !== value.trim()) {
      onCommitText(nextValue);
    }
    setIsInlineEditing(false);
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

  const startInlineEditing = (clientX?: number, sourceEl?: HTMLElement | null) => {
    if (!preferInlineTextEditing || isReadOnly) return;
    setInlineInputValue(value);
    setIsInlineEditing(true);
    requestAnimationFrame(() => {
      inlineInputRef.current?.focus();
      const caretIndex = typeof clientX === 'number' && sourceEl
        ? getCaretIndexFromClick(value, sourceEl, clientX)
        : value.length;
      inlineInputRef.current?.setSelectionRange(caretIndex, caretIndex);
    });
  };

  const handleInlineInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commitInlineInputValue();
      requestAnimationFrame(() => cellRef.current?.focus());
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setInlineInputValue(value);
      setIsInlineEditing(false);
      requestAnimationFrame(() => cellRef.current?.focus());
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
        onMouseDownCapture={(e) => {
          if (e.button !== 0) return;
          if (!isEmptyTreatmentCell || isReadOnly) {
            cellRef.current?.focus();
          }
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          cellRef.current?.focus();
        }}
        onClick={() => {
          cellRef.current?.focus();
        }}
        onDoubleClick={openSelector}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={handleKeyDown}
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
                  ref={emptyInputRef}
                  value={emptyInputValue}
                  onChange={(e) => setEmptyInputValue(e.target.value)}
                  onKeyDown={handleEmptyInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-transparent outline-none border-none text-[16.5px] sm:text-[17.6px] xl:text-[16.5px] font-semibold text-left text-slate-900 dark:text-slate-100 placeholder:text-gray-400"
                  placeholder={placeholder}
                />
              ) : preferInlineTextEditing && !isReadOnly ? (
                isInlineEditing ? (
                <input
                  ref={inlineInputRef}
                  value={inlineInputValue}
                  onChange={(e) => setInlineInputValue(e.target.value)}
                  onKeyDown={handleInlineInputKeyDown}
                  onBlur={commitInlineInputValue}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-transparent outline-none border-none text-[16.5px] sm:text-[17.6px] xl:text-[16.5px] font-semibold text-left text-slate-900 dark:text-slate-100 placeholder:text-gray-400"
                  placeholder={placeholder}
                />
                ) : (
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      startInlineEditing(e.clientX, e.currentTarget);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="max-w-full bg-transparent outline-none border-none p-0 text-[16.5px] sm:text-[17.6px] xl:text-[16.5px] font-semibold text-left text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-all"
                  >
                    {value || placeholder}
                  </button>
                )
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
