
import React, { memo, Fragment } from 'react';
import { formatTime } from '../../utils/bedUtils';

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
}

export const TreatmentTextRenderer: React.FC<TreatmentTextRendererProps> = memo(({
  value,
  placeholder,
  isActiveRow,
  activeStepIndex,
  activeStepColor,
  activeStepBgColor,
  timerStatus = 'normal',
  remainingTime,
  isPaused
}) => {
  if (!value) {
    return (
      <span className="text-gray-400 italic font-bold">
        {placeholder}
      </span>
    );
  }

  // 타이머 표시 여부: 활성 행이고 타이머가 동작 중일 때
  const showTimer = isActiveRow && remainingTime !== undefined && (remainingTime !== 0 || timerStatus === 'overtime');

  // 타이머 색상
  const timerColorClass =
    timerStatus === 'overtime' ? 'text-red-500' :
    timerStatus === 'warning' ? 'text-orange-500' :
    'text-slate-600 dark:text-slate-300';

  const timerAnimClass = (timerStatus === 'overtime' || timerStatus === 'warning') ? 'animate-pulse' : '';

  // 활성화 상태이고 단계 인덱스가 유효할 때: 텍스트를 분리하여 하이라이팅
  if (isActiveRow && activeStepIndex >= 0) {
    const parts = value.split('/');
    return (
      <div className="flex items-center flex-wrap gap-y-1 leading-relaxed">
        {parts.map((part, i) => (
          <Fragment key={i}>
            {i === activeStepIndex ? (
              <>
                <span className={`
                  inline-flex items-center justify-center
                  ${activeStepBgColor || 'bg-brand-500'}
                  text-white px-1.5 py-[1px] rounded-md
                  text-[13px] sm:text-sm xl:text-[13px]
                  font-black shadow-sm ring-1 ring-white/20
                  transition-all duration-300 z-10
                `}>
                  {part.trim()}
                </span>
                {showTimer && (
                  <span className={`ml-1 text-[12px] sm:text-[13px] font-black tabular-nums ${timerColorClass} ${timerAnimClass} ${isPaused ? 'opacity-50' : ''}`}>
                    {timerStatus === 'overtime' && '+'}{formatTime(remainingTime!)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-700 dark:text-gray-300 px-0.5">
                {part.trim()}
              </span>
            )}
            {i < parts.length - 1 && <span className="text-gray-400 mx-0.5 self-center">/</span>}
          </Fragment>
        ))}
      </div>
    );
  }

  // 기본 상태: 전체 텍스트 표시 (활성 단계 색상이 있으면 적용)
  return (
    <span className={activeStepColor || 'text-gray-700 dark:text-gray-300'}>
      {value}
    </span>
  );
});
