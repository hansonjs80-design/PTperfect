import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Timer } from 'lucide-react';
import {
  getBedTimerOnlyPreference,
  setBedTimerOnlyPreference,
  getBulkTimerMinutes,
  setBulkTimerMinutes as persistBulkTimerMinutes,
} from '../utils/timerOnlyPreference';

interface BedEmptyStateProps {
  bedId: number;
  onOpenSelector: () => void;
  onStartTimerOnly: (minutes?: number) => void;
  onStartTimerOnlyAll: (minutes?: number) => void;
}

export const BedEmptyState: React.FC<BedEmptyStateProps> = ({ bedId, onOpenSelector, onStartTimerOnly, onStartTimerOnlyAll }) => {
  const [timerOnlyChecked, setTimerOnlyChecked] = useState(false);
  const [bulkTimerMinutes, setBulkTimerMinutes] = useState(10);

  useEffect(() => {
    setTimerOnlyChecked(getBedTimerOnlyPreference(bedId));
    setBulkTimerMinutes(getBulkTimerMinutes(10));
  }, [bedId]);

  const persistBulkMinutes = useCallback((nextMinutes: number) => {
    persistBulkTimerMinutes(nextMinutes);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (timerOnlyChecked) {
      onStartTimerOnly(bulkTimerMinutes);
      return;
    }
    onOpenSelector();
  }, [onOpenSelector, onStartTimerOnly, timerOnlyChecked, bulkTimerMinutes]);

  const handleBulkMinutesChange = useCallback((raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const normalized = Math.max(1, Math.round(parsed));
    setBulkTimerMinutes(normalized);
    persistBulkMinutes(normalized);
  }, [persistBulkMinutes]);

  const handleTimerOnlyToggle = useCallback((checked: boolean) => {
    setTimerOnlyChecked(checked);
    setBedTimerOnlyPreference(bedId, checked);
  }, [bedId]);

  const handleStartAllTimer = useCallback(() => {
    onStartTimerOnlyAll(10);
  }, [onStartTimerOnlyAll]);

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
        {timerOnlyChecked ? `탭하면 ${bulkTimerMinutes}분 일반 타이머 시작` : (<><span className="hidden md:inline">클릭하여 시작</span><span className="md:hidden">탭하여 시작</span></>)}
      </span>

      <div className="mt-3 flex flex-col items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <label
          className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
        >
          <input
            type="checkbox"
            checked={timerOnlyChecked}
            onChange={(e) => handleTimerOnlyToggle(e.target.checked)}
            className="accent-brand-500"
          />
          타이머만 사용
        </label>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            value={bulkTimerMinutes}
            onChange={(e) => handleBulkMinutesChange(e.target.value)}
            className="w-[62px] px-1.5 py-1 text-[11px] text-center font-bold rounded border border-brand-300 bg-white dark:bg-slate-800 dark:border-slate-600"
            aria-label="전체 타이머 분 설정"
          />
          <button
            type="button"
            onClick={handleStartAllTimer}
            className="text-[11px] font-bold px-2 py-1 rounded-lg border border-indigo-400 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300"
            title="모든 배드에 10분 타이머를 즉시 적용"
          >
            전체 타이머 적용 (10분)
          </button>
        </div>
      </div>
    </div>
  );
};
