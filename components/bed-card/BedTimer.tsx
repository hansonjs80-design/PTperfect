
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
  onTogglePause: (e: React.MouseEvent) => void;
}

export const BedTimer: React.FC<BedTimerProps> = memo(({ 
  bed, 
  isTimerActive, 
  isOvertime, 
  isNearEnd, 
  onTimerClick, 
  onTogglePause 
}) => {
  if (!isTimerActive) {
    if (bed.status === BedStatus.COMPLETED) {
      return (
        <div className="flex items-center gap-1 lg:gap-1.5 px-2 py-1 lg:px-3 lg:py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full shadow-sm scale-[0.95] lg:scale-100 origin-right lg:origin-center">
          <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" />
          <span className="text-xs lg:text-sm font-bold">완료</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div 
      className={`flex items-center gap-2 lg:gap-3 cursor-pointer transition-all scale-[0.95] lg:scale-100 origin-right lg:origin-center ${bed.isPaused ? 'opacity-50 grayscale' : ''}`}
    >
      {/* 
        Timer Text Updated: 
        text-2xl -> text-3xl 
        lg:text-4xl -> lg:text-5xl 
      */}
      <span 
        onDoubleClick={onTimerClick}
        className={`font-black text-3xl lg:text-5xl tracking-tighter leading-none tabular-nums ${
        isOvertime ? 'text-red-500 animate-pulse' : 
        isNearEnd ? 'text-orange-500 animate-pulse' :
        'text-slate-700 dark:text-slate-200'
      }`}>
        {isOvertime && '+'}{formatTime(bed.remainingTime)}
      </span>

      {/* Pause Button */}
      <button 
        onClick={onTogglePause}
        className={`p-1.5 lg:p-2 rounded-full transition-colors active:scale-90 shadow-sm ${
          bed.isPaused 
            ? 'bg-brand-500 text-white' 
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
        }`}
      >
        {bed.isPaused ? <Play className="w-3.5 h-3.5 lg:w-4 lg:h-4 fill-current" /> : <Pause className="w-3.5 h-3.5 lg:w-4 lg:h-4 fill-current" />}
      </button>
    </div>
  );
});
