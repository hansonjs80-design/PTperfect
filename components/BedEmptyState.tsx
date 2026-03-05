
import React, { useCallback } from 'react';
import { Plus } from 'lucide-react';

interface BedEmptyStateProps {
  onOpenSelector: () => void;
}

export const BedEmptyState: React.FC<BedEmptyStateProps> = ({ onOpenSelector }) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenSelector();
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
        <span className="md:hidden">탭하여 시작</span>
      </span>
    </div>
  );
};
