import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, Save, X, Clock } from 'lucide-react';
import { computePopupPosition } from '../../utils/popupUtils';

type AdjustMode = 'minute' | 'second30' | 'minute5';
type TimePart = 'minute' | 'second';

interface TimerEditPopupProps {
  title: string;
  initialSeconds: number;
  position?: { x: number; y: number };
  onConfirm: (seconds: number) => void;
  onCancel: () => void;
}

const formatTimeInput = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseTimeInput = (raw: string): number | null => {
  const clean = raw.trim();
  if (!clean) return null;

  const parts = clean.split(':');
  if (parts.length > 2) return null;

  if (parts.length === 2) {
    const m = parseInt(parts[0] || '0', 10);
    const s = parseInt(parts[1] || '0', 10);
    if (Number.isNaN(m) || Number.isNaN(s)) return null;
    return Math.max(0, m) * 60 + Math.min(59, Math.max(0, s));
  }

  const digits = clean.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const numeric = parseInt(digits, 10);
  if (Number.isNaN(numeric)) return null;

  if (digits.length <= 2) return numeric;
  const minutePart = parseInt(digits.slice(0, -2), 10);
  const secondPart = parseInt(digits.slice(-2), 10);
  if (Number.isNaN(minutePart) || Number.isNaN(secondPart)) return null;
  return Math.max(0, minutePart) * 60 + Math.min(59, Math.max(0, secondPart));
};

export const TimerEditPopup: React.FC<TimerEditPopupProps> = ({
  title,
  initialSeconds,
  position,
  onConfirm,
  onCancel
}) => {
  const [totalSeconds, setTotalSeconds] = useState(Math.max(30, initialSeconds));
  const [timeInput, setTimeInput] = useState(formatTimeInput(Math.max(30, initialSeconds)));
  const [activePart, setActivePart] = useState<TimePart>('minute');
  const [adjustMode, setAdjustMode] = useState<AdjustMode>('minute');

  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>(() => {
    if (!position) return {};
    const p = computePopupPosition(position, 296, 332, { preferAbove: true, centerOnClick: true, gap: 12 });
    return { top: p.top, left: p.left, position: 'absolute' as const };
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const minutes = Math.floor(totalSeconds / 60);
  const secondsRemainder = totalSeconds % 60;

  const setClampedSeconds = (nextSeconds: number) => {
    setTotalSeconds(Math.max(30, nextSeconds));
  };

  const selectTimePart = (part: TimePart) => {
    const input = timeInputRef.current;
    if (!input) return;

    const colonIndex = input.value.indexOf(':');
    if (colonIndex < 0) return;

    if (part === 'minute') input.setSelectionRange(0, colonIndex);
    else input.setSelectionRange(colonIndex + 1, input.value.length);
    setActivePart(part);
  };

  const currentStepSeconds = useMemo(() => {
    if (adjustMode === 'second30') return 30;
    if (adjustMode === 'minute5') return 300;
    return 60;
  }, [adjustMode]);

  useEffect(() => {
    setTimeInput(formatTimeInput(totalSeconds));
  }, [totalSeconds]);

  useEffect(() => {
    if (timeInputRef.current) {
      timeInputRef.current.focus();
      selectTimePart('minute');
    }
  }, []);

  useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [onCancel]);

  useLayoutEffect(() => {
    if (position && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const refined = computePopupPosition(position, rect.width, rect.height, { preferAbove: true, centerOnClick: true, gap: 12 });
      setPopupStyle({ top: refined.top, left: refined.left, position: 'absolute' });
    } else if (!position) {
      setPopupStyle({});
    }
  }, [position]);

  const handleAdjustByMode = (direction: 1 | -1) => {
    if (adjustMode === 'minute' || adjustMode === 'minute5') {
      const minuteAligned = Math.floor(totalSeconds / 60) * 60;
      setClampedSeconds(minuteAligned + direction * currentStepSeconds);
      return;
    }

    if (adjustMode === 'second30') {
      const halfMinuteAligned = Math.floor(totalSeconds / 30) * 30;
      setClampedSeconds(halfMinuteAligned + direction * currentStepSeconds);
      return;
    }

    setClampedSeconds(totalSeconds + direction * currentStepSeconds);
  };

  const handleAdjustActivePart = (direction: 1 | -1) => {
    if (activePart === 'minute') {
      setClampedSeconds(totalSeconds + direction * 60);
      return;
    }
    setClampedSeconds(totalSeconds + direction);
  };

  const handleConfirm = () => {
    onConfirm(Math.max(30, totalSeconds));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextRaw = e.target.value.replace(/[^0-9:]/g, '');
    const normalized = nextRaw.split(':').length > 2
      ? nextRaw.replace(/:/g, '').replace(/(\d+)(\d{2})$/, '$1:$2')
      : nextRaw;

    setTimeInput(normalized);
    const parsed = parseTimeInput(normalized);
    if (parsed !== null) setClampedSeconds(parsed);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      requestAnimationFrame(() => selectTimePart('minute'));
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      requestAnimationFrame(() => selectTimePart('second'));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleAdjustActivePart(1);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleAdjustActivePart(-1);
      return;
    }
  };

  const handleInputClick = () => {
    const input = timeInputRef.current;
    if (!input) return;
    const caret = input.selectionStart ?? 0;
    const colonIndex = input.value.indexOf(':');
    if (colonIndex < 0) return;
    const nextPart: TimePart = caret <= colonIndex ? 'minute' : 'second';
    requestAnimationFrame(() => selectTimePart(nextPart));
  };

  const handleInputBlur = () => {
    setTimeInput(formatTimeInput(totalSeconds));
  };

  const overlayClass = position
    ? 'fixed inset-0 z-[100] bg-transparent'
    : 'fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200';

  const popupClass = position
    ? 'absolute w-[min(92vw,296px)] max-h-[min(78vh,360px)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150 origin-bottom'
    : 'w-[min(92vw,296px)] max-h-[min(82vh,380px)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150';

  return createPortal(
    <div className={overlayClass} onClick={onCancel}>
      <div
        ref={containerRef}
        style={popupStyle}
        className={popupClass}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 min-w-0">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-bold truncate">{title}</span>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2.5 sm:p-3 flex flex-col gap-2 overflow-y-auto">
          <div className="flex items-center justify-between gap-1.5">
            <button
              onClick={() => handleAdjustByMode(-1)}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl text-gray-600 dark:text-gray-300 shadow-sm active:scale-90 transition-all border border-gray-200 dark:border-slate-600"
              aria-label="시간 감소"
            >
              <Minus className="w-4.5 h-4.5" strokeWidth={3} />
            </button>

            <input
              ref={timeInputRef}
              type="text"
              inputMode="numeric"
              value={timeInput}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onClick={handleInputClick}
              onBlur={handleInputBlur}
              className="flex-1 min-w-0 bg-white dark:bg-slate-900 border-2 border-brand-500 rounded-xl py-1 text-[28px] leading-none font-black text-center text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all tabular-nums"
              aria-label="타이머 시간"
              placeholder="0:30"
            />

            <button
              onClick={() => handleAdjustByMode(1)}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl text-brand-600 dark:text-brand-400 shadow-sm active:scale-90 transition-all border border-gray-200 dark:border-slate-600"
              aria-label="시간 증가"
            >
              <Plus className="w-4.5 h-4.5" strokeWidth={3} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setAdjustMode('minute')}
              className={`py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition-colors ${adjustMode === 'minute' ? 'bg-brand-600 text-white' : 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              1분
            </button>
            <button
              onClick={() => setAdjustMode('second30')}
              className={`py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition-colors ${adjustMode === 'second30' ? 'bg-brand-600 text-white' : 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              30초
            </button>
            <button
              onClick={() => setAdjustMode('minute5')}
              className={`py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition-colors ${adjustMode === 'minute5' ? 'bg-brand-600 text-white' : 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              5분
            </button>
          </div>

          <div className="text-center text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 leading-tight">
            총 시간: {minutes}:{secondsRemainder.toString().padStart(2, '0')} · 현재 조정 단위: {adjustMode === 'minute' ? '1분' : adjustMode === 'second30' ? '30초' : '5분'}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-2 bg-brand-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 mt-0.5"
          >
            <Save className="w-4 h-4" />
            적용
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
