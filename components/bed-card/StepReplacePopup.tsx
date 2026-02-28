import React, { useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QuickTreatment } from '../../types';
import { computePopupPosition } from '../../utils/popupUtils';

const POPUP_WIDTH = 340;

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

  // Pre-compute initial position using estimated height (avoids -9999 off-screen jump)
  const [pos, setPos] = useState(() => {
    const estRows = Math.max(Math.ceil(quickTreatments.length / 2), 1);
    const estHeight = Math.min(estRows * 46 + 12, 320) + 36;
    return computePopupPosition(clickPos, POPUP_WIDTH, estHeight);
  });

  // Refine with actual measured dimensions (runs synchronously before paint)
  useLayoutEffect(() => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const refined = computePopupPosition(clickPos, rect.width, rect.height);
    setPos(refined);
  }, [clickPos]);

  return createPortal(
    <div className="fixed inset-0 z-[9999]" onClick={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={panelRef}
        className="absolute bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-gray-200 dark:border-slate-600 overflow-hidden animate-in zoom-in-95 duration-100"
        style={{
          top: pos.top,
          left: pos.left,
          width: POPUP_WIDTH,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2.5 py-1.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <span className="font-bold text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">처방 변경</span>
        </div>
        <div className="p-1.5 grid grid-cols-2 gap-1 max-h-[320px] overflow-y-auto">
          {quickTreatments.map((qt) => (
            <button
              key={qt.id}
              onClick={() => onSelect(qt)}
              className="w-full flex items-center gap-2 rounded-md px-2 py-2 hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 dark:hover:ring-offset-slate-800 active:scale-[0.99] transition-all duration-100 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700"
              title={qt.name}
            >
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${qt.color} shrink-0`} />
              <span className="text-[12px] sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 text-left leading-tight break-words">
                {qt.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};
