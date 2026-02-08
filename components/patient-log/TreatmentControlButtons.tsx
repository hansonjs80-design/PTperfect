
import React, { memo } from 'react';
import { SkipBack, SkipForward, CheckCircle } from 'lucide-react';

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

  return (
    <div className="absolute left-0 z-10 flex items-center h-full gap-0.5 px-0.5 bg-gradient-to-r from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900">
      
      {/* Prev Button (Only Active) */}
      {rowStatus === 'active' && onPrevStep && activeStepIndex > 0 && (
        <button 
            onClick={(e) => onActionClick(e, 'prev')}
            className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-400 hover:text-brand-600 transition-all active:scale-95"
            title="이전 단계"
        >
            <SkipBack className="w-3.5 h-3.5 fill-current" />
        </button>
      )}

      {/* Next/Complete Button (Only Active) */}
      {rowStatus === 'active' && onNextStep && (
        <button 
            onClick={(e) => onActionClick(e, 'next')}
            className={`p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-all active:scale-95 ${
                isLastStep ? 'text-red-600 hover:text-red-700' : 'text-gray-400 hover:text-brand-600'
            }`}
            title={isLastStep ? "치료 완료" : "다음 단계"}
        >
            <SkipForward className="w-3.5 h-3.5 fill-current" />
        </button>
      )}

      {/* Clear Button (Only Completed) */}
      {rowStatus === 'completed' && onClearBed && (
          <button
            onClick={(e) => onActionClick(e, 'clear')}
            className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-400 hover:text-red-600 transition-all active:scale-95"
            title="침상 비우기"
          >
            <CheckCircle className="w-3.5 h-3.5" />
          </button>
      )}
    </div>
  );
});
