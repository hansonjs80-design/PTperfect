import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  interactiveStepEdit?: boolean;
  quickTreatments?: QuickTreatment[];
  onDeleteStep?: (idx: number) => void;
  onMoveStep?: (idx: number, direction: 'left' | 'right') => void;
  onSwapSteps?: (fromIdx: number, toIdx: number) => void;
  onReplaceStep?: (idx: number, qt: QuickTreatment) => void;
  onOpenFullEditor?: () => void;
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
  interactiveStepEdit = false,
  quickTreatments = [],
  onDeleteStep,
  onMoveStep,
  onSwapSteps,
  onReplaceStep,
  onOpenFullEditor
}) => {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [replacePopup, setReplacePopup] = useState<{ idx: number; x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ idx: number; at: number } | null>(null);

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
        e.preventDefault();
        e.stopPropagation();
        if (selectedStepIndex <= 0) return;
        onMoveStep?.(selectedStepIndex, 'left');
        setSelectedStepIndex(selectedStepIndex - 1);
        return;
      }

      if (e.key === 'ArrowRight') {
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


  const canShowMobileStepControls = () => (
    interactiveStepEdit
    && selectedStepIndex !== null
    && isMobileOrTabletMode()
  );

  const handleMobileMove = (direction: 'left' | 'right') => {
    if (selectedStepIndex === null) return;
    const target = direction === 'left' ? selectedStepIndex - 1 : selectedStepIndex + 1;
    if (target < 0 || target >= parts.length) return;
    onMoveStep?.(selectedStepIndex, direction);
    setSelectedStepIndex(target);
  };

  const handleMobileDelete = () => {
    if (selectedStepIndex === null) return;
    onDeleteStep?.(selectedStepIndex);
    setSelectedStepIndex(null);
  };

  const handleChipClick = (e: React.MouseEvent<HTMLSpanElement>, idx: number) => {
    if (!interactiveStepEdit) return;

    e.stopPropagation();
    e.preventDefault();

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
          const isSelected = interactiveStepEdit && selectedStepIndex === i;

          return (
            <span
              key={`${part}-${i}`}
              data-step-chip="true"
              tabIndex={interactiveStepEdit ? 0 : -1}
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
                ${interactiveStepEdit ? 'cursor-pointer' : ''}
                ${isCurrent
                  ? `${activeStepBgColor || 'bg-brand-500'} text-white border-transparent shadow-sm ring-1 ring-white/20`
                  : 'bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'}
              `}
            >
              <span className={!isCurrent ? 'text-black dark:text-slate-100' : undefined}>{part}</span>
              {isCurrent && typeof remainingTime === 'number' && (
                <>
                  <span className={`text-[12.1px] sm:text-[13.2px] font-black ${
                    timerStatus === 'overtime'
                      ? 'text-red-200'
                      : timerStatus === 'warning'
                        ? 'text-white'
                        : 'text-emerald-100'
                  }`}>
                    {formatTimer((!isPaused && remainingTime === 0) ? 1 : remainingTime)}
                  </span>
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

      {canShowMobileStepControls() && (
        <div className="mt-1 flex items-center gap-1.5" data-step-chip="true">
          <button
            type="button"
            data-step-chip="true"
            onClick={(e) => {
              e.stopPropagation();
              handleMobileDelete();
            }}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-red-500 text-white active:scale-95"
            title="선택 처방 삭제"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            data-step-chip="true"
            onClick={(e) => {
              e.stopPropagation();
              handleMobileMove('left');
            }}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-100 disabled:opacity-40 active:scale-95"
            disabled={selectedStepIndex === null || selectedStepIndex <= 0}
            title="왼쪽 이동"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            data-step-chip="true"
            onClick={(e) => {
              e.stopPropagation();
              handleMobileMove('right');
            }}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-100 disabled:opacity-40 active:scale-95"
            disabled={selectedStepIndex === null || selectedStepIndex >= parts.length - 1}
            title="오른쪽 이동"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
