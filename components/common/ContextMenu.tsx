
import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { computePopupPosition } from '../../utils/popupUtils';

interface ContextMenuProps {
  title: string;
  position: { x: number; y: number };
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  headerActions?: React.ReactNode;
  maxHeight?: number | string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  title,
  position,
  onClose,
  children,
  width = 256, // w-64
  headerActions,
  maxHeight = 'min(70vh, calc(100vh - 24px))',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Pre-compute initial position (estimated height ~150px)
  const [pos, setPos] = useState(() => {
    const p = computePopupPosition(position, width, 150);
    return { x: p.left, y: p.top };
  });

  // Refine with actual measured dimensions
  useLayoutEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const refined = computePopupPosition(position, rect.width, rect.height);
      setPos({ x: refined.left, y: refined.top });
    }
  }, [position]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-transparent"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        ref={containerRef}
        className="absolute bg-white dark:bg-slate-800 rounded-2xl shadow-[0_18px_48px_rgba(15,23,42,0.22)] border border-slate-300 dark:border-slate-600 overflow-hidden animate-in zoom-in-95 duration-150 origin-top-left flex flex-col"
        style={{
          top: pos.y,
          left: pos.x,
          width: width,
          maxHeight,
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-100/95 dark:bg-slate-900/80 shrink-0">
          <span className="font-black text-slate-800 dark:text-white text-[13px] truncate pr-2 tracking-[0.01em]">
            {title}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {headerActions}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-3 flex flex-col gap-2 bg-white dark:bg-slate-800">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
