
import React, { memo } from 'react';
import { CheckCircle, Pause, Play } from 'lucide-react';
import { BedState, BedStatus } from '../../types';
import { formatTime } from '../../utils/bedUtils';

interface BedTimerProps {
  bed: BedState;
  isTimerActive: boolean;
  isOvertime: boolean;
  isNearEnd: boolean;
  onTimerClick: (e: React.MouseEvent) => void;
  onTimerTouchClick?: (e: React.MouseEvent) => void; // Deprecated
  onTogglePause: (e: React.MouseEvent) => void;
  compact?: boolean;
}

export const BedTimer: React.FC<BedTimerProps> = memo(({
  bed,
  isTimerActive,
  isOvertime,
  isNearEnd,
  onTimerClick,
  onTogglePause,
  compact = false
}) => {
  if (!isTimerActive) {
    if (bed.status === BedStatus.COMPLETED) {
      return (
        <div className="flex items-center gap-1 lg:gap-1.5 px-2 py-1 md:px-2.5 md:py-1.5 lg:px-3 lg:py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full shadow-sm scale-[0.95] md:scale-100 lg:scale-100 origin-right md:origin-center lg:origin-center">
          <CheckCircle className="w-4 h-4 md:w-5 md:h-5 lg:w-5 lg:h-5" />
          <span className="text-xs md:text-sm lg:text-sm font-bold">완료</span>
        </div>
      );
    }
    return null;
  }

  // compact: md+ portrait에서 이름이 있을 때 타이머 축소
  // 모바일(sm 이하)은 원래 크기 유지
  const timerSizeClass = compact
    ? 'text-3xl sm:text-[33px] md:portrait:text-[28px] lg:portrait:text-[32px] md:landscape:text-[38px] lg:landscape:text-[44px]'
    : 'text-3xl sm:text-[33px] md:text-[38px] lg:text-[44px]';

  const displayRemaining = (!bed.isPaused && bed.remainingTime === 0) ? 1 : bed.remainingTime;

  return (
    <div
      className={`flex items-center justify-end gap-[5px] sm:gap-[10px] cursor-pointer transition-all scale-[0.95] lg:scale-100 origin-right lg:origin-center ${bed.isPaused ? 'opacity-50 grayscale' : ''}`}
    >
      <span
        onClick={onTimerClick}
        className={`font-black ${timerSizeClass} tracking-[-0.08em] sm:tracking-tighter leading-[0.75] tabular-nums ${isOvertime ? 'text-red-500 animate-pulse' :
          isNearEnd ? 'text-orange-500 animate-pulse' :
            'text-slate-700 dark:text-slate-200'
          }`}>
        {isOvertime && '+'}{formatTime(displayRemaining)}
      </span>

      <button
        onClick={onTogglePause}
        className={`shrink-0 p-1.5 lg:p-2 rounded-full transition-colors active:scale-90 shadow-sm ${bed.isPaused
          ? 'bg-brand-500 text-white'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
          }`}
      >
        {bed.isPaused ? <Play className="w-3.5 h-3.5 sm:w-[15px] sm:h-[15px] md:w-[18px] md:h-[18px] lg:w-4 lg:h-4 fill-current" /> : <Pause className="w-3.5 h-3.5 sm:w-[15px] sm:h-[15px] md:w-[18px] md:h-[18px] lg:w-4 lg:h-4 fill-current" />}
      </button>
    </div>
  );
});
