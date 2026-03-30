import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { QuickTreatment } from '../../types';
import { StepReplacePopup } from '../bed-card/StepReplacePopup';

interface TreatmentTextRendererProps {
  value: string;
  placeholder?: string;
  isActiveRow: boolean;
  activeStepIndex: number;
  activeStepColor?: string;
  activeStepBgColor?: string;
  timerStatus?: 'normal' | 'warning' | 'overtime';
  remainingTime?: number;
  isPaused?: boolean;
  onTogglePause?: () => void;
  onOpenTimerEdit?: (position: { x: number; y: number }) => void;
  interactiveStepEdit?: boolean;
  allowStepSelection?: boolean;
  quickTreatments?: QuickTreatment[];
  onDeleteStep?: (idx: number) => void;
  onMoveStep?: (idx: number, direction: 'left' | 'right') => void;
  onSwapSteps?: (fromIdx: number, toIdx: number) => void;
  onReplaceStep?: (idx: number, qt: QuickTreatment) => void;
  onOpenFullEditor?: () => void;
  selectedStepIndex?: number | null;
  onSelectedStepIndexChange?: (idx: number | null) => void;
}

export const TreatmentTextRenderer: React.FC<TreatmentTextRendererProps> = memo(({
  value,
  placeholder,
  isActiveRow,
  activeStepIndex,
  activeStepBgColor,
  timerStatus = 'normal',
  remainingTime,
  isPaused,
  onTogglePause,
  onOpenTimerEdit,
  interactiveStepEdit = false,
  allowStepSelection = false,
  quickTreatments = [],
  onDeleteStep,
  onMoveStep,
  onSwapSteps,
  onReplaceStep,
  onOpenFullEditor,
  selectedStepIndex: controlledSelectedStepIndex,
  onSelectedStepIndexChange,
}) => {
  const [internalSelectedStepIndex, setInternalSelectedStepIndex] = useState<number | null>(null);
  const [replacePopup, setReplacePopup] = useState<{ idx: number; x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ idx: number; at: number } | null>(null);

  const selectedStepIndex = controlledSelectedStepIndex ?? internalSelectedStepIndex;
  const canSelectStepChip = interactiveStepEdit || allowStepSelection;

  const setSelectedStepIndex = (next: number | null) => {
    if (controlledSelectedStepIndex !== undefined) {
      onSelectedStepIndexChange?.(next);
      return;
    }

    setInternalSelectedStepIndex(next);
    onSelectedStepIndexChange?.(next);
  };

  const formatTimer = (seconds: number) => {
    const safe = Math.floor(seconds);
    const abs = Math.abs(safe);
    const mm = Math.floor(abs / 60).toString().padStart(2, '0');
    const ss = (abs % 60).toString().padStart(2, '0');
    const prefix = safe < 0 ? '+' : '';
    return `${prefix}${mm}:${ss}`;
  };

  const parts = useMemo(() => value.split('/').map((part) => part.trim()).filter(Boolean), [value]);

  useEffect(() => {
    if (selectedStepIndex === null || !interactiveStepEdit) return;

    const handleWindowPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const clickedChip = !!target.closest('[data-step-chip="true"]');
      if (clickedChip) return;

      setSelectedStepIndex(null);
    };

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (selectedStepIndex === null) return;

      const target = e.target as HTMLElement | null;
      const isEditableTarget = !!target && (
        target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.isContentEditable
      );
      if (isEditableTarget) return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        onDeleteStep?.(selectedStepIndex);
        setSelectedStepIndex(null);
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (!e.altKey) {
          setSelectedStepIndex(null);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (selectedStepIndex <= 0) return;
        onMoveStep?.(selectedStepIndex, 'left');
        setSelectedStepIndex(selectedStepIndex - 1);
        return;
      }

      if (e.key === 'ArrowRight') {
        if (!e.altKey) {
          setSelectedStepIndex(null);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (selectedStepIndex >= parts.length - 1) return;
        onMoveStep?.(selectedStepIndex, 'right');
        setSelectedStepIndex(selectedStepIndex + 1);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedStepIndex(null);
      }
    };

    window.addEventListener('pointerdown', handleWindowPointerDown, true);
    window.addEventListener('keydown', handleWindowKeyDown, true);

    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown, true);
      window.removeEventListener('keydown', handleWindowKeyDown, true);
    };
  }, [interactiveStepEdit, onDeleteStep, onMoveStep, parts.length, selectedStepIndex]);

  const isMobileOrTabletMode = () => window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches;


  if (!value || parts.length === 0) {
    return (
      <span className="text-gray-400 italic font-bold">
        {placeholder}
      </span>
    );
  }



  const handleChipClick = (e: React.MouseEvent<HTMLSpanElement>, idx: number) => {
    if (!canSelectStepChip) return;

    e.stopPropagation();
    e.preventDefault();

    if (!interactiveStepEdit) {
      setSelectedStepIndex(selectedStepIndex === idx ? null : idx);
      return;
    }

    // 모바일/태블릿은 더블터치로 데스크탑 우클릭과 동일한 단일 처방 교체 팝업을 연다.
    if (isMobileOrTabletMode() && onReplaceStep && quickTreatments.length > 0) {
      const now = Date.now();
      const last = lastTapRef.current;
      const isDoubleTap = !!last && last.idx === idx && now - last.at <= 320;

      if (isDoubleTap) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setSelectedStepIndex(idx);
        setReplacePopup({
          idx,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
        lastTapRef.current = null;
        return;
      }

      lastTapRef.current = { idx, at: now };
    }

    if (selectedStepIndex === null) {
      setSelectedStepIndex(idx);
      return;
    }

    if (selectedStepIndex === idx) {
      setSelectedStepIndex(null);
      return;
    }

    onSwapSteps?.(selectedStepIndex, idx);
    setSelectedStepIndex(null);
  };

  return (
    <>
      <div className="flex items-center flex-wrap gap-1 py-0.5">
        {parts.map((part, i) => {
          const isCurrent = isActiveRow && i === activeStepIndex;
          const isSelected = canSelectStepChip && selectedStepIndex === i;

          return (
            <span
              key={`${part}-${i}`}
              data-step-chip="true"
              tabIndex={canSelectStepChip ? 0 : -1}
              onClick={(e) => handleChipClick(e, i)}
              onContextMenu={(e) => {
                if (!interactiveStepEdit || !onReplaceStep || quickTreatments.length === 0) return;
                e.preventDefault();
                e.stopPropagation();
                setSelectedStepIndex(i);
                setReplacePopup({ idx: i, x: e.clientX, y: e.clientY });
              }}
              onDoubleClick={(e) => {
                if (!interactiveStepEdit) return;
                e.preventDefault();
                e.stopPropagation();

                // 모바일/태블릿 더블터치: 데스크탑 우클릭과 같은 단순 처방 목록(치환 팝업)
                if (isMobileOrTabletMode() && onReplaceStep && quickTreatments.length > 0) {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setSelectedStepIndex(i);
                  setReplacePopup({
                    idx: i,
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                  });
                  return;
                }

                onOpenFullEditor?.();
              }}
              className={`
                inline-flex items-center gap-1 rounded-md border px-1.5 py-[1px]
                text-[14.3px] sm:text-[15.4px] xl:text-[14.3px] font-black leading-tight
                transition-colors duration-200
                ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900' : ''}
                ${canSelectStepChip ? 'cursor-pointer' : ''}
                ${isCurrent
                  ? `${activeStepBgColor || 'bg-brand-500'} text-white border-transparent shadow-sm ring-1 ring-white/20`
                  : 'bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'}
              `}
            >
              <span className={!isCurrent ? 'text-black dark:text-slate-100' : undefined}>{part}</span>
              {isCurrent && typeof remainingTime === 'number' && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      onOpenTimerEdit?.({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
                    }}
                    className={`text-[12.1px] sm:text-[13.2px] font-black underline underline-offset-2 decoration-dotted ${
                      timerStatus === 'overtime'
                        ? 'text-red-200'
                        : timerStatus === 'warning'
                          ? 'text-white'
                          : 'text-emerald-100'
                    }`}
                    title="시간 조정"
                  >
                    {formatTimer((!isPaused && remainingTime === 0) ? 1 : remainingTime)}
                  </button>
                  {onTogglePause && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePause();
                      }}
                      className={`ml-0.5 shrink-0 p-[3px] rounded-full transition-colors active:scale-90 shadow-sm ${isPaused
                        ? 'bg-brand-500 text-white'
                        : 'text-white/90 hover:text-white bg-white/20 hover:bg-white/30 border border-white/30'
                        }`}
                      title={isPaused ? '타이머 시작' : '타이머 일시정지'}
                    >
                      {isPaused
                        ? <Play className="w-3 h-3 fill-current" />
                        : <Pause className="w-3 h-3 fill-current" />}
                    </button>
                  )}
                </>
              )}
            </span>
          );
        })}
      </div>

      {replacePopup && onReplaceStep && quickTreatments.length > 0 && (
        <StepReplacePopup
          quickTreatments={quickTreatments}
          clickPos={{ x: replacePopup.x, y: replacePopup.y }}
          onSelect={(qt) => {
            onReplaceStep(replacePopup.idx, qt);
            setReplacePopup(null);
            setSelectedStepIndex(null);
          }}
          onClose={() => setReplacePopup(null)}
        />
      )}
    </>
  );
});
