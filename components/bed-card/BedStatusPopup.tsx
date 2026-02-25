
import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { BedState } from '../../types';
import { BedEditFlags } from '../bed-edit/BedEditFlags';
import { computePopupPosition } from '../../utils/popupUtils';

interface BedStatusPopupProps {
  bed: BedState;
  position: { x: number; y: number };
  onClose: () => void;
  onToggleInjection: (id: number) => void;
  onToggleFluid: (id: number) => void;
  onToggleTraction: (id: number) => void;
  onToggleESWT: (id: number) => void;
  onToggleManual: (id: number) => void;
  onToggleInjectionCompleted: (id: number) => void;
}

export const BedStatusPopup: React.FC<BedStatusPopupProps> = ({
  bed,
  position,
  onClose,
  onToggleInjection,
  onToggleFluid,
  onToggleTraction,
  onToggleESWT,
  onToggleManual,
  onToggleInjectionCompleted
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Breakpoint for Desktop/Tablet (matches tailwind md: 768px)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  // Pre-compute initial position (estimated height ~250px for desktop)
  const [safePos, setSafePos] = useState(() => {
    if (!isDesktop) return position;
    const p = computePopupPosition(position, 340, 250, { preferAbove: true, centerOnClick: true, gap: 10 });
    return { x: p.left, y: p.top };
  });

  // Window Escape Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Refine with actual measured dimensions
  useLayoutEffect(() => {
    if (isDesktop && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const refined = computePopupPosition(position, rect.width, rect.height, { preferAbove: true, centerOnClick: true, gap: 10 });
      setSafePos({ x: refined.left, y: refined.top });
    }
  }, [position, isDesktop]);

  const overlayClass = isDesktop
    ? "fixed inset-0 z-[100] bg-transparent"
    : "fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200";

  const containerStyle = isDesktop
    ? { top: safePos.y, left: safePos.x }
    : {}; // Centered via flex in overlayClass

  const containerClass = isDesktop
    ? "absolute w-[340px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150 origin-bottom"
    : "w-[340px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150";

  return createPortal(
    <div
      className={overlayClass}
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className={containerClass}
        style={containerStyle}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">상태 표시 변경</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900">
          <BedEditFlags
            bed={bed}
            onToggleInjection={onToggleInjection}
            onToggleFluid={onToggleFluid}
            onToggleManual={onToggleManual}
            onToggleESWT={onToggleESWT}
            onToggleTraction={onToggleTraction}
            onToggleInjectionCompleted={onToggleInjectionCompleted}
          />
        </div>

        <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            완료
          </button>
        </div>

        {/* Decorative arrow for desktop popup */}
        {isDesktop && (
          <div
            className={`absolute w-3 h-3 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 transform rotate-45 ${safePos.y > position.y ? '-top-1.5 border-t border-l' : '-bottom-1.5 border-b border-r'}`}
            style={{
              left: Math.max(10, Math.min(320, position.x - safePos.x - 6))
            }}
          />
        )}
      </div>
    </div>,
    document.body
  );
};
