import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, Save, X, Clock } from 'lucide-react';
import { computePopupPosition } from '../../utils/popupUtils';

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
  const [totalSeconds, setTotalSeconds] = useState(Math.max(60, initialSeconds));

  // Pre-compute initial popup style (estimated compact height)
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>(() => {
    if (!position) return {};
    const p = computePopupPosition(position, 252, 252, { preferAbove: true, centerOnClick: true, gap: 16 });
    return { top: p.top, left: p.left, position: 'absolute' as const };
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const minutes = Math.floor(totalSeconds / 60);
  const secondsRemainder = totalSeconds % 60;

  const setClampedSeconds = (nextSeconds: number) => {
    setTotalSeconds(Math.max(60, nextSeconds));
  };

  // Auto focus
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Window Escape Listener
  useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [onCancel]);

  // Refine positioning with actual measured dimensions
  useLayoutEffect(() => {
    if (position && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const refined = computePopupPosition(position, rect.width, rect.height, { preferAbove: true, centerOnClick: true, gap: 16 });
      setPopupStyle({ top: refined.top, left: refined.left, position: 'absolute' });
    } else if (!position) {
      setPopupStyle({});
    }
  }, [position]);

  const handleAdjustMinutes = (deltaMinutes: number) => {
    setClampedSeconds(totalSeconds + deltaMinutes * 60);
  };

  const handleAdjustSeconds = (deltaSeconds: number) => {
    setClampedSeconds(totalSeconds + deltaSeconds);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === '') {
      setTotalSeconds(60);
      return;
    }
    const val = parseInt(e.target.value, 10);
    if (!Number.isNaN(val)) {
      setClampedSeconds(val * 60 + secondsRemainder);
    }
  };

  const handleConfirm = () => {
    onConfirm(Math.max(60, totalSeconds));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
  };

  const overlayClass = position
    ? 'fixed inset-0 z-[100] bg-transparent'
    : 'fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200';

  return createPortal(
    <div
      className={overlayClass}
      onClick={onCancel}
    >
      <div
        ref={containerRef}
        className={`w-[252px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-600 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col ${position ? 'absolute' : 'relative'}`}
        style={popupStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 min-w-0">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-bold truncate">{title}</span>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3 flex flex-col gap-2.5">
          {/* Main Controls */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => handleAdjustMinutes(-1)}
              className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl text-gray-600 dark:text-gray-300 shadow-sm active:scale-90 transition-all border border-gray-200 dark:border-slate-600"
              aria-label="1분 감소"
            >
              <Minus className="w-4.5 h-4.5" strokeWidth={3} />
            </button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="number"
                min={1}
                value={minutes}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="w-full bg-white dark:bg-slate-900 border-2 border-brand-500 rounded-xl py-1 text-2xl font-black text-center text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 dark:text-slate-500 pointer-events-none">분</span>
            </div>

            <button
              onClick={() => handleAdjustMinutes(1)}
              className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl text-brand-600 dark:text-brand-400 shadow-sm active:scale-90 transition-all border border-gray-200 dark:border-slate-600"
              aria-label="1분 증가"
            >
              <Plus className="w-4.5 h-4.5" strokeWidth={3} />
            </button>
          </div>

          <div className="text-center text-[11px] font-bold text-gray-500 dark:text-gray-400">
            총 시간: {minutes}:{secondsRemainder.toString().padStart(2, '0')}
          </div>

          {/* Quick Adjust Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => handleAdjustSeconds(-30)} className="py-1 text-[10px] font-bold bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">-30초</button>
            <button onClick={() => handleAdjustSeconds(30)} className="py-1 text-[10px] font-bold bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">+30초</button>
            <button onClick={() => handleAdjustMinutes(-5)} className="py-1 text-[10px] font-bold bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">-5분</button>
            <button onClick={() => handleAdjustMinutes(5)} className="py-1 text-[10px] font-bold bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">+5분</button>
          </div>

          {/* Action Button */}
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
