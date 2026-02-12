
import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { BedState } from '../../types';
import { BedEditFlags } from '../bed-edit/BedEditFlags';

interface BedStatusPopupProps {
  bed: BedState;
  position: { x: number; y: number };
  onClose: () => void;
  onToggleInjection: (id: number) => void;
  onToggleFluid: (id: number) => void;
  onToggleTraction: (id: number) => void;
  onToggleESWT: (id: number) => void;
  onToggleManual: (id: number) => void;
}

export const BedStatusPopup: React.FC<BedStatusPopupProps> = ({
  bed, 
  position,
  onClose, 
  onToggleInjection, 
  onToggleFluid, 
  onToggleTraction, 
  onToggleESWT, 
  onToggleManual
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [safePos, setSafePos] = useState(position);
  
  // Breakpoint for Desktop/Tablet (matches tailwind md: 768px)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

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

  useLayoutEffect(() => {
    if (isDesktop && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      
      // Default: Above the mouse, centered horizontally
      let top = position.y - rect.height - 10;
      let left = position.x - (rect.width / 2);

      // 1. Vertical Check
      // If it goes off top, flip to below
      if (top < 10) {
        top = position.y + 20;
      }
      // If flip goes off bottom, pin to bottom
      if (top + rect.height > screenH - 10) {
        top = screenH - rect.height - 10;
      }

      // 2. Horizontal Check
      // Left edge
      if (left < 10) left = 10;
      // Right edge
      if (left + rect.width > screenW - 10) {
        left = screenW - rect.width - 10;
      }

      setSafePos({ x: left, y: top });
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
           {/* Reuse existing flags component but in a simplified modal context */}
           <BedEditFlags
             bed={bed}
             onToggleInjection={onToggleInjection}
             onToggleFluid={onToggleFluid}
             onToggleManual={onToggleManual}
             onToggleESWT={onToggleESWT}
             onToggleTraction={onToggleTraction}
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
               left: Math.max(10, Math.min(320, position.x - safePos.x - 6)) // Clamp arrow to stay within box width
             }}
           />
        )}
      </div>
    </div>,
    document.body
  );
};
