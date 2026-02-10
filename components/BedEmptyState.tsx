
import React, { useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';

interface BedEmptyStateProps {
  onOpenSelector: () => void;
}

export const BedEmptyState: React.FC<BedEmptyStateProps> = ({ onOpenSelector }) => {
  const lastClickTimeRef = useRef<number>(0);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event from bubbling to parent container which might trigger other logic

    // Device Capability Check
    const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    // Check for Tablet/Desktop width (md breakpoint = 768px)
    const isTabletOrDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

    // Single Click Action if:
    // 1. Not a touch device (Desktop Mouse)
    // 2. Touch device but large screen (Tablet) -> User requested single tap for tablet
    if (!isTouchDevice || isTabletOrDesktop) {
      onOpenSelector();
      return;
    }

    // Mobile (Touch & Small Screen): Implement Manual Double Tap Detection
    // Native onDoubleClick is unreliable on some mobile browsers due to zoom delays or event handling
    const now = Date.now();
    const timeDiff = now - lastClickTimeRef.current;

    // 350ms window for double tap
    if (timeDiff < 350 && timeDiff > 0) {
      // Double Tap Detected
      // Prevent Default is critical here to avoid ghost clicks or zooming
      if (e.cancelable) e.preventDefault(); 
      onOpenSelector();
      lastClickTimeRef.current = 0; // Reset
    } else {
      // First Tap: Record time
      lastClickTimeRef.current = now;
    }
  }, [onOpenSelector]);

  return (
    <div 
      onClick={handleClick}
      className="w-full h-full flex flex-col items-center justify-center cursor-pointer group select-none touch-manipulation"
    >
      <div className="p-3 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 group-hover:scale-110 transition-all duration-300">
        <Plus className="w-6 h-6 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors" />
      </div>
      <span className="mt-2 text-xs font-bold text-slate-300 dark:text-slate-600 group-hover:text-brand-500/70 transition-colors">
        <span className="hidden md:inline">클릭하여 시작</span>
        <span className="md:hidden">더블탭하여 시작</span>
      </span>
    </div>
  );
};
