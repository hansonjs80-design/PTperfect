
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
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  title,
  position,
  onClose,
  children,
  width = 256, // w-64
  headerActions
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
        className="absolute bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150 origin-top-left flex flex-col"
        style={{
          top: pos.y,
          left: pos.x,
          width: width
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 shrink-0">
          <span className="font-bold text-gray-800 dark:text-white text-xs truncate pr-2">
            {title}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {headerActions}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-2 flex flex-col gap-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
