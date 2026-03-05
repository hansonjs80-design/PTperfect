import React, { useCallback, useState } from 'react';
import { Plus, Timer } from 'lucide-react';

interface BedEmptyStateProps {
  onOpenSelector: () => void;
  onStartTimerOnly: (minutes?: number) => void;
  onStartTimerOnlyAll: (minutes?: number) => void;
}

export const BedEmptyState: React.FC<BedEmptyStateProps> = ({ onOpenSelector, onStartTimerOnly, onStartTimerOnlyAll }) => {
  const [timerOnlyChecked, setTimerOnlyChecked] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (timerOnlyChecked) {
      onStartTimerOnly(10);
      return;
    }
    onOpenSelector();
  }, [onOpenSelector, onStartTimerOnly, timerOnlyChecked]);

  return (
    <div
      onClick={handleClick}
      className="w-full h-full flex flex-col items-center justify-center cursor-pointer group select-none touch-manipulation"
    >
      <div className="p-3 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 group-hover:scale-110 transition-all duration-300">
        {timerOnlyChecked ? (
          <Timer className="w-6 h-6 text-brand-500 transition-colors" />
        ) : (
          <Plus className="w-6 h-6 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors" />
        )}
      </div>
      <span className="mt-2 text-xs font-bold text-slate-300 dark:text-slate-600 group-hover:text-brand-500/70 transition-colors">
        {timerOnlyChecked ? '탭하면 10분 타이머 시작' : (<><span className="hidden md:inline">클릭하여 시작</span><span className="md:hidden">탭하여 시작</span></>)}
      </span>

      <div className="mt-3 flex flex-col items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <label
        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
      >
        <input
          type="checkbox"
          checked={timerOnlyChecked}
          onChange={(e) => setTimerOnlyChecked(e.target.checked)}
          className="accent-brand-500"
        />
        타이머만 사용
      </label>
      <button
        type="button"
        onClick={() => onStartTimerOnlyAll(10)}
        className="text-[11px] font-bold px-2 py-1 rounded-lg border border-brand-300 text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-300"
      >
        전체 배드 타이머(10분)
      </button>
      </div>
    </div>
  );
};
