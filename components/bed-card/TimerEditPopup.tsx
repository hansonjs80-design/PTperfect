import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, Save, X, Clock } from 'lucide-react';
import { computePopupPosition } from '../../utils/popupUtils';

type AdjustMode = 'minute' | 'second30' | 'minute5';

interface TimerEditPopupProps {
  title: string;
  initialSeconds: number;
  position?: { x: number; y: number }; // Optional position
  onConfirm: (seconds: number) => void;
  onCancel: () => void;
}

export const TimerEditPopup: React.FC<TimerEditPopupProps> = ({
  title,
  initialSeconds,
  position,
  onConfirm,
  onCancel
}) => {
  const [totalSeconds, setTotalSeconds] = useState(Math.max(30, initialSeconds));
  const [adjustMode, setAdjustMode] = useState<AdjustMode>('minute');

  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>(() => {
    if (!position) return {};
    const p = computePopupPosition(position, 280, 292, { preferAbove: true, centerOnClick: true, gap: 16 });
    return { top: p.top, left: p.left, position: 'absolute' as const };
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);
  const secondInputRef = useRef<HTMLInputElement>(null);

  const minutes = Math.floor(totalSeconds / 60);
  const secondsRemainder = totalSeconds % 60;

  const setClampedSeconds = (nextSeconds: number) => {
    setTotalSeconds(Math.max(30, nextSeconds));
  };

  const currentStepSeconds = useMemo(() => {
    if (adjustMode === 'second30') return 30;
    if (adjustMode === 'minute5') return 300;
    return 60;
  }, [adjustMode]);

  useEffect(() => {
    if (minuteInputRef.current) {
      minuteInputRef.current.focus();
      minuteInputRef.current.select();
    }
  }, []);

  useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [onCancel]);

  useLayoutEffect(() => {
    if (position && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const refined = computePopupPosition(position, rect.width, rect.height, { preferAbove: true, centerOnClick: true, gap: 16 });
      setPopupStyle({ top: refined.top, left: refined.left, position: 'absolute' });
    } else if (!position) {
      setPopupStyle({});
    }
  }, [position]);

  const handleAdjustByMode = (direction: 1 | -1) => {
    // 1분/5분 조정 시에는 초를 항상 00으로 맞춘 뒤 분 단위 증감한다.
    if (adjustMode === 'minute' || adjustMode === 'minute5') {
      const minuteAligned = Math.floor(totalSeconds / 60) * 60;
      setClampedSeconds(minuteAligned + direction * currentStepSeconds);
      return;
    }

    setClampedSeconds(totalSeconds + direction * currentStepSeconds);
  };

  const handleMinuteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setClampedSeconds(secondsRemainder);
      return;
    }
    const val = Math.max(0, parseInt(raw, 10) || 0);
    setClampedSeconds(val * 60 + secondsRemainder);
  };

  const handleSecondInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setClampedSeconds(minutes * 60);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const clampedSec = Math.min(59, Math.max(0, parsed));
    setClampedSeconds(minutes * 60 + clampedSec);
  };

  const handleConfirm = () => {
    onConfirm(Math.max(30, totalSeconds));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
      return;
    }

    // Desktop quick adjustments
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setClampedSeconds(totalSeconds + 60);
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setClampedSeconds(totalSeconds - 60);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setClampedSeconds(totalSeconds + 30);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setClampedSeconds(totalSeconds - 30);
      return;
    }
  };

  const overlayClass = position
    ? 'fixed inset-0 z-[100] bg-transparent'
    : 'fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200';

  return createPortal(
    <div className={overlayClass} onClick={onCancel}>
      <div
        ref={containerRef}
        className={`w-[280px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-600 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col ${position ? 'absolute' : 'relative'}`}
        style={popupStyle}
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

        <div className="p-3 flex flex-col gap-2.5" onKeyDown={handleKeyDown}>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => handleAdjustByMode(-1)}
              className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl text-gray-600 dark:text-gray-300 shadow-sm active:scale-90 transition-all border border-gray-200 dark:border-slate-600"
              aria-label="시간 감소"
            >
              <Minus className="w-4.5 h-4.5" strokeWidth={3} />
            </button>

            <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="relative">
                <input
                  ref={minuteInputRef}
                  type="number"
                  min={0}
                  value={minutes}
                                    onChange={handleMinuteInputChange}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-brand-500 rounded-xl py-1 text-xl font-black text-center text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 dark:text-slate-500 pointer-events-none">분</span>
              </div>

              <span className="text-gray-400 font-black">:</span>

              <div className="relative">
                <input
                  ref={secondInputRef}
                  type="number"
                  min={0}
                  max={59}
                  value={secondsRemainder}
                                    onChange={handleSecondInputChange}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-brand-500 rounded-xl py-1 text-xl font-black text-center text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 dark:text-slate-500 pointer-events-none">초</span>
              </div>
            </div>

            <button
              onClick={() => handleAdjustByMode(1)}
              className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl text-brand-600 dark:text-brand-400 shadow-sm active:scale-90 transition-all border border-gray-200 dark:border-slate-600"
              aria-label="시간 증가"
            >
              <Plus className="w-4.5 h-4.5" strokeWidth={3} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setAdjustMode('minute')}
              className={`py-1 text-[10px] font-bold rounded-md transition-colors ${adjustMode === 'minute' ? 'bg-brand-600 text-white' : 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              1분
            </button>
            <button
              onClick={() => setAdjustMode('second30')}
              className={`py-1 text-[10px] font-bold rounded-md transition-colors ${adjustMode === 'second30' ? 'bg-brand-600 text-white' : 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              30초
            </button>
            <button
              onClick={() => setAdjustMode('minute5')}
              className={`py-1 text-[10px] font-bold rounded-md transition-colors ${adjustMode === 'minute5' ? 'bg-brand-600 text-white' : 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              5분
            </button>
          </div>

          <div className="text-center text-[11px] font-bold text-gray-500 dark:text-gray-400">
            총 시간: {minutes}:{secondsRemainder.toString().padStart(2, '0')} · 현재 조정 단위: {adjustMode === 'minute' ? '1분' : adjustMode === 'second30' ? '30초' : '5분'}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-2 bg-brand-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
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
