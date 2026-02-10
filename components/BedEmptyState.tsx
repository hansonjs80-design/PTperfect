
import React, { useRef } from 'react';
import { Plus } from 'lucide-react';

interface BedEmptyStateProps {
  onOpenSelector: () => void;
}

export const BedEmptyState: React.FC<BedEmptyStateProps> = ({ onOpenSelector }) => {
  const lastClickTimeRef = useRef<number>(0);
  
  const handleClick = (e: React.MouseEvent) => {
    // Device Capability Check
    // 'coarse' pointer usually indicates a touch device (Mobile/Tablet)
    const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

    if (!isTouchDevice) {
      // Desktop (Mouse): Single Click triggers action immediately
      onOpenSelector();
      return;
    }

    // Mobile (Touch): Implement Manual Double Tap Detection
    // Native onDoubleClick is unreliable on some mobile browsers due to zoom delays or event handling
    const now = Date.now();
    const timeDiff = now - lastClickTimeRef.current;

    // 350ms window for double tap
    if (timeDiff < 350 && timeDiff > 0) {
      // Double Tap Detected
      e.preventDefault();
      onOpenSelector();
      lastClickTimeRef.current = 0; // Reset
    } else {
      // First Tap: Record time
      lastClickTimeRef.current = now;
    }
  };

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
