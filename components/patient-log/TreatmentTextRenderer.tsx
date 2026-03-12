import React, { memo, useMemo, useState } from 'react';
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

  const formatTimer = (seconds: number) => {
    const safe = Math.floor(seconds);
    const abs = Math.abs(safe);
    const mm = Math.floor(abs / 60).toString().padStart(2, '0');
    const ss = (abs % 60).toString().padStart(2, '0');
    const prefix = safe < 0 ? '+' : '';
    return `${prefix}${mm}:${ss}`;
  };

  const parts = useMemo(() => value.split('/').map((part) => part.trim()).filter(Boolean), [value]);

  if (!value || parts.length === 0) {
    return (
      <span className="text-gray-400 italic font-bold">
        {placeholder}
      </span>
    );
  }

  const handleChipClick = (e: React.MouseEvent, idx: number) => {
    if (!interactiveStepEdit) return;

    e.stopPropagation();
    e.preventDefault();

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

  const handleChipKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (!interactiveStepEdit || selectedStepIndex === null) return;

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
      onMoveStep?.(selectedStepIndex, 'left');
      setSelectedStepIndex(Math.max(0, selectedStepIndex - 1));
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      onMoveStep?.(selectedStepIndex, 'right');
      setSelectedStepIndex(Math.min(parts.length - 1, selectedStepIndex + 1));
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedStepIndex(null);
    }
  };

  return (
    <>
      <div className="flex items-center flex-wrap gap-1 py-0.5" onKeyDown={handleChipKeyDown}>
        {parts.map((part, i) => {
          const isCurrent = isActiveRow && i === activeStepIndex;
          const isSelected = interactiveStepEdit && selectedStepIndex === i;

          return (
            <span
              key={`${part}-${i}`}
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
                onOpenFullEditor?.();
              }}
              className={`
                inline-flex items-center gap-1 rounded-md border px-1.5 py-[1px]
                text-[12px] sm:text-[13px] xl:text-[12px] font-black leading-tight
                transition-colors duration-200
                ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900' : ''}
                ${interactiveStepEdit ? 'cursor-pointer' : ''}
                ${isCurrent
                  ? `${activeStepBgColor || 'bg-brand-500'} text-white border-transparent shadow-sm ring-1 ring-white/20`
                  : 'bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'}
              `}
            >
              <span>{part}</span>
              {isCurrent && typeof remainingTime === 'number' && (
                <>
                  <span className={`text-[10px] sm:text-[11px] font-black ${
                    timerStatus === 'overtime'
                      ? 'text-red-200'
                      : timerStatus === 'warning'
                        ? 'text-yellow-100'
                        : 'text-emerald-100'
                  }`}>
                    {formatTimer(remainingTime)}
                  </span>
                  {onTogglePause && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePause();
                      }}
                      className="ml-0.5 rounded bg-white/20 hover:bg-white/30 px-1 py-[1px] text-[9px] sm:text-[10px] font-black leading-none"
                      title={isPaused ? '타이머 시작' : '타이머 일시정지'}
                    >
                      {isPaused ? '시작' : '일시정지'}
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
