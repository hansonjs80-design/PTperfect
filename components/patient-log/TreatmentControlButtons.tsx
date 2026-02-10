
import React, { memo } from 'react';
import { SkipBack, SkipForward, CheckCircle, X } from 'lucide-react';

interface TreatmentControlButtonsProps {
  rowStatus: 'active' | 'completed' | 'none';
  activeStepIndex: number;
  isLastStep: boolean;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  onClearBed?: () => void;
  onActionClick: (e: React.MouseEvent, type: 'prev' | 'next' | 'clear') => void;
}

export const TreatmentControlButtons: React.FC<TreatmentControlButtonsProps> = memo(({
  rowStatus,
  activeStepIndex,
  isLastStep,
  onPrevStep,
  onNextStep,
  onClearBed,
  onActionClick
}) => {
  // Active 또는 Completed 상태가 아니면 렌더링하지 않음
  if (rowStatus !== 'active' && rowStatus !== 'completed') return null;

  // Icon Class: Increased from w-3.5 (14px) to w-[18px] (~30% bigger)
  const iconClass = "w-[18px] h-[18px]"; 
  // Button Class: Increased padding from p-0.5 to p-1
  const btnClass = "p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-all active:scale-95";

  return (
    <div className="absolute right-0 z-10 flex items-center h-full gap-0.5 px-0.5 bg-gradient-to-l from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900">
      
      {/* Prev Button (Active 중이거나 Completed 일 때 모두 표시) */}
      {onPrevStep && (rowStatus === 'active' ? activeStepIndex > 0 : true) && (
        <button 
            onClick={(e) => onActionClick(e, 'prev')}
            className={`${btnClass} text-gray-400 hover:text-brand-600`}
            title="이전 단계로 복구"
        >
            <SkipBack className={`${iconClass} fill-current`} />
        </button>
      )}

      {/* Quick Clear Button (Active 상태의 0번 스텝일 때만 취소용으로 표시) */}
      {rowStatus === 'active' && activeStepIndex === 0 && onClearBed && (
          <button
            onClick={(e) => onActionClick(e, 'clear')}
            className={`${btnClass} text-gray-400 hover:text-red-600`}
            title="침상 비우기"
          >
            <X className={iconClass} />
          </button>
      )}

      {/* Next/Complete Button (Only Active) */}
      {rowStatus === 'active' && onNextStep && (
        <button 
            onClick={(e) => onActionClick(e, 'next')}
            className={`${btnClass} ${
                isLastStep ? 'text-red-600 hover:text-red-700' : 'text-gray-400 hover:text-brand-600'
            }`}
            title={isLastStep ? "치료 완료" : "다음 단계"}
        >
            <SkipForward className={`${iconClass} fill-current`} />
        </button>
      )}

      {/* Clear Button (Only Completed - when treatment is finished) */}
      {rowStatus === 'completed' && onClearBed && (
          <button
            onClick={(e) => onActionClick(e, 'clear')}
            className={`${btnClass} text-gray-400 hover:text-red-600`}
            title="침상 비우기"
          >
            <CheckCircle className={iconClass} />
          </button>
      )}
    </div>
  );
});
