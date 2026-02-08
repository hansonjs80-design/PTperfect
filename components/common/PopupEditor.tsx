
import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';

interface PopupEditorProps {
  title: string;
  initialValue: string | number;
  type?: 'text' | 'number';
  position?: { x: number; y: number };
  centered?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  suffix?: string;
}

export const PopupEditor: React.FC<PopupEditorProps> = ({
  title,
  initialValue,
  type = 'text',
  position,
  centered = false,
  onConfirm,
  onCancel,
  suffix
}) => {
  const [value, setValue] = useState(String(initialValue));
  const [pos, setPos] = useState(position || { x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Smart Positioning: 화면 밖으로 나가지 않게 조정 (centered 모드가 아닐 때만)
  useLayoutEffect(() => {
    if (centered || !position) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      
      let newX = position.x;
      let newY = position.y;

      // 오른쪽 끝 처리
      if (newX + rect.width > screenW) {
        newX = screenW - rect.width - 10;
      }
      // 왼쪽 끝 처리
      if (newX < 10) newX = 10;

      // 아래쪽 끝 처리 (팝업을 위로 올림)
      if (newY + rect.height > screenH) {
        newY = position.y - rect.height - 10;
      }
      // 위쪽 끝 처리
      if (newY < 10) newY = 10;

      setPos({ x: newX, y: newY });
    }
  }, [position, centered]);

  // Auto Focus
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onConfirm(value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const overlayClass = centered 
    ? "fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200" 
    : "fixed inset-0 z-[9999] bg-transparent";

  const containerStyle = centered 
    ? {} 
    : { top: pos.y, left: pos.x };

  return createPortal(
    <div 
      className={overlayClass}
      onClick={onCancel}
    >
      <div
        ref={containerRef}
        className={`absolute w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-600 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col ${centered ? 'relative' : 'origin-top-left'}`}
        style={containerStyle}
        onClick={(e) => e.stopPropagation()} // 내부 클릭 시 닫기 방지
      >
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
          <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{title}</span>
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 relative">
            <input
              ref={inputRef}
              type={type}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white dark:bg-slate-900 border-2 border-brand-500 rounded-xl py-3 px-4 text-xl font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all placeholder:text-gray-300 dark:placeholder:text-slate-600 text-center"
            />
            {suffix && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">
                {suffix}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
                onClick={onCancel}
                className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
                취소
            </button>
            <button
                onClick={() => onConfirm(value)}
                className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
                <Save className="w-4 h-4" />
                저장
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
