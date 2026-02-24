
import React, { useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QuickTreatment } from '../../types';

interface StepReplacePopupProps {
  quickTreatments: QuickTreatment[];
  clickPos: { x: number; y: number };
  onSelect: (qt: QuickTreatment) => void;
  onClose: () => void;
}

export const StepReplacePopup: React.FC<StepReplacePopupProps> = ({
  quickTreatments,
  clickPos,
  onSelect,
  onClose,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const pad = 8;

    let left = clickPos.x;
    let top = clickPos.y;

    if (left + rect.width > sw - pad) left = sw - rect.width - pad;
    if (left < pad) left = pad;
    if (top + rect.height > sh - pad) top = clickPos.y - rect.height;
    if (top < pad) top = pad;

    setPos({ top, left });
  }, [clickPos]);

  return createPortal(
    <div className="fixed inset-0 z-[9999]" onClick={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={panelRef}
        className="absolute bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-gray-200 dark:border-slate-600 overflow-hidden animate-in zoom-in-95 duration-100"
        style={{
          top: pos ? pos.top : -9999,
          left: pos ? pos.left : -9999,
          opacity: pos ? 1 : 0,
          width: 200,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2.5 py-1.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <span className="font-bold text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">처방 변경</span>
        </div>
        <div className="p-1.5 grid grid-cols-3 gap-1 max-h-[280px] overflow-y-auto">
          {quickTreatments.map((qt) => (
            <button
              key={qt.id}
              onClick={() => onSelect(qt)}
              className={`
                flex flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5
                hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 dark:hover:ring-offset-slate-800
                active:scale-95 transition-all duration-100
                bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700
              `}
            >
              <div className={`w-7 h-7 rounded-md ${qt.color} flex items-center justify-center`}>
                <span className="text-white text-[10px] font-black leading-none">{qt.label}</span>
              </div>
              <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 leading-tight truncate w-full text-center">
                {qt.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};
