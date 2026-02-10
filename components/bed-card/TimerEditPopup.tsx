
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, Save, X, Clock } from 'lucide-react';

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
  // 초기값을 분 단위로 변환 (최소 1분)
  const [minutes, setMinutes] = useState(Math.ceil(Math.max(60, initialSeconds) / 60));
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Smart Positioning: Place ABOVE the click by default
  useLayoutEffect(() => {
    if (position && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      
      const GAP = 10;
      // Default: Center horizontally on click, Place ABOVE click
      let left = position.x - (rect.width / 2);
      let top = position.y - rect.height - GAP - 10; // 10px offset up

      // 1. Vertical Check
      // If it goes off top, flip to BELOW
      if (top < GAP) {
        top = position.y + 20;
      }
      // If flipping to below goes off bottom, pin to bottom
      if (top + rect.height > screenH - GAP) {
        top = screenH - rect.height - GAP;
      }

      // 2. Horizontal Check
      // Left edge
      if (left < GAP) left = GAP;
      // Right edge
      if (left + rect.width > screenW - GAP) {
        left = screenW - rect.width - GAP;
      }

      setPopupStyle({ top, left, position: 'absolute' });
    } else if (!position) {
      // Fallback: Centered
      setPopupStyle({}); 
    }
  }, [position]);

  const handleAdjust = (delta: number) => {
    setMinutes(prev => {
      const nextVal = prev + delta;
      return nextVal < 1 ? 1 : nextVal;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === '') {
        setMinutes(0); 
        return;
    }
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      setMinutes(val);
    }
  };

  const handleConfirm = () => {
    const finalMinutes = minutes <= 0 ? 1 : minutes;
    onConfirm(finalMinutes * 60);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  const overlayClass = position 
    ? "fixed inset-0 z-[100] bg-transparent" // Transparent overlay for click-outside
    : "fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200";

  return createPortal(
    <div 
      className={overlayClass}
      onClick={onCancel}
    >
      <div
        ref={containerRef}
        className={`w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-600 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col ${position ? 'absolute' : 'relative'}`}
        style={popupStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{title}</span>
          </div>
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3">
          
          {/* Main Controls */}
          <div className="flex items-center justify-between gap-2">
            <button 
              onClick={() => handleAdjust(-1)}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl text-gray-600 dark:text-gray-300 shadow-sm active:scale-90 transition-all border border-gray-200 dark:border-slate-600"
            >
              <Minus className="w-5 h-5" strokeWidth={3} />
            </button>

            <div className="flex-1 relative">
                <input
                    ref={inputRef}
                    type="number"
                    value={minutes === 0 ? '' : minutes}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-brand-500 rounded-xl py-1.5 text-3xl font-black text-center text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all placeholder:text-gray-300 dark:placeholder:text-slate-600"
                    placeholder="0"
                />
                <span className="absolute right-2 bottom-2 text-[10px] font-bold text-gray-400 dark:text-slate-500 pointer-events-none">분</span>
            </div>

            <button 
              onClick={() => handleAdjust(1)}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl text-brand-600 dark:text-brand-400 shadow-sm active:scale-90 transition-all border border-gray-200 dark:border-slate-600"
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>

          {/* Quick Adjust Buttons */}
          <div className="flex gap-2 justify-center">
             <button 
                onClick={() => handleAdjust(-5)}
                className="flex-1 py-1.5 text-[10px] font-bold bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 transition-colors"
             >
                -5분
             </button>
             <button 
                onClick={() => handleAdjust(5)}
                className="flex-1 py-1.5 text-[10px] font-bold bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 transition-colors"
             >
                +5분
             </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleConfirm}
            className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 mt-1"
          >
            <Save className="w-4 h-4" />
            시간 변경 적용
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
