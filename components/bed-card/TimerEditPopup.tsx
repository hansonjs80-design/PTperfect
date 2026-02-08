
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, Save, X, Clock } from 'lucide-react';

interface TimerEditPopupProps {
  title: string;
  initialSeconds: number;
  onConfirm: (seconds: number) => void;
  onCancel: () => void;
}

export const TimerEditPopup: React.FC<TimerEditPopupProps> = ({
  title,
  initialSeconds,
  onConfirm,
  onCancel
}) => {
  // 초기값을 분 단위로 변환 (최소 1분)
  const [minutes, setMinutes] = useState(Math.ceil(Math.max(60, initialSeconds) / 60));
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleAdjust = (delta: number) => {
    setMinutes(prev => {
      const nextVal = prev + delta;
      return nextVal < 1 ? 1 : nextVal;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 빈 값 허용 (사용자가 지우고 다시 쓸 때)
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
    // 0분이거나 빈 값이면 저장 안함 혹은 최소 1분 처리
    const finalMinutes = minutes <= 0 ? 1 : minutes;
    onConfirm(finalMinutes * 60);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="relative w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-600 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
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
