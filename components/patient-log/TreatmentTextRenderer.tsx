
import React, { memo } from 'react';

interface TreatmentTextRendererProps {
  value: string;
  placeholder?: string;
  isActiveRow: boolean;
  activeStepIndex: number;
  activeStepColor?: string;
  activeStepBgColor?: string;
  timerStatus?: 'normal' | 'warning' | 'overtime';
  remainingTime?: number;
  isPaused?: boolean;
  onTogglePause?: () => void;
}

export const TreatmentTextRenderer: React.FC<TreatmentTextRendererProps> = memo(({
  value,
  placeholder,
  isActiveRow,
  activeStepIndex,
  activeStepBgColor,
  timerStatus = 'normal',
  remainingTime,
  isPaused,
  onTogglePause
}) => {
  const formatTimer = (seconds: number) => {
    const safe = Math.floor(seconds);
    const abs = Math.abs(safe);
    const mm = Math.floor(abs / 60).toString().padStart(2, '0');
    const ss = (abs % 60).toString().padStart(2, '0');
    const prefix = safe < 0 ? '+' : '';
    return `${prefix}${mm}:${ss}`;
  };

  if (!value) {
    return (
      <span className="text-gray-400 italic font-bold">
        {placeholder}
      </span>
    );
  }

  const parts = value
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return (
      <span className="text-gray-400 italic font-bold">
        {placeholder}
      </span>
    );
  }

  return (
    <div className="flex items-center flex-wrap gap-1 py-0.5">
      {parts.map((part, i) => {
        const isCurrent = isActiveRow && i === activeStepIndex;

        return (
          <span
            key={`${part}-${i}`}
            className={`
              inline-flex items-center gap-1 rounded-md border px-1.5 py-[1px]
              text-[12px] sm:text-[13px] xl:text-[12px] font-black leading-tight
              transition-colors duration-200
              ${isCurrent
                ? `${activeStepBgColor || 'bg-brand-500'} text-white border-transparent shadow-sm ring-1 ring-white/20`
                : 'bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'}
            `}
          >
            <span>{part}</span>
            {isCurrent && typeof remainingTime === 'number' && (
              <>
                <span className={`text-[10px] sm:text-[11px] font-black ${
                  timerStatus === 'overtime'
                    ? 'text-red-200'
                    : timerStatus === 'warning'
                      ? 'text-yellow-100'
                      : 'text-emerald-100'
                }`}>
                  {formatTimer(remainingTime)}
                </span>
                {onTogglePause && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePause();
                    }}
                    className="ml-0.5 rounded bg-white/20 hover:bg-white/30 px-1 py-[1px] text-[9px] sm:text-[10px] font-black leading-none"
                    title={isPaused ? '타이머 시작' : '타이머 일시정지'}
                  >
                    {isPaused ? '시작' : '일시정지'}
                  </button>
                )}
              </>
            )}
          </span>
        );
      })}
    </div>
  );
});
