
import React, { memo, useState } from 'react';
import { SkipBack, SkipForward, CheckCircle, X, Plus } from 'lucide-react';
import { QuickTreatment } from '../../types';
import { StepReplacePopup } from '../bed-card/StepReplacePopup';

interface TreatmentControlButtonsProps {
  rowStatus: 'active' | 'completed' | 'none';
  activeStepIndex: number;
  isLastStep: boolean;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  onClearBed?: () => void;
  onAddStep?: (qt: QuickTreatment) => void;
  quickTreatments?: QuickTreatment[];
  onActionClick: (e: React.MouseEvent, type: 'prev' | 'next' | 'clear') => void;
}

export const TreatmentControlButtons: React.FC<TreatmentControlButtonsProps> = memo(({
  rowStatus,
  activeStepIndex,
  isLastStep,
  onPrevStep,
  onNextStep,
  onClearBed,
  onAddStep,
  quickTreatments = [],
  onActionClick
}) => {
  const [addPopupPos, setAddPopupPos] = useState<{ x: number; y: number } | null>(null);

  if (rowStatus !== 'active' && rowStatus !== 'completed') return null;

  const iconClass = "w-[18px] h-[18px]";
  const btnClass = "p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-all active:scale-95";

  return (
    <>
      <div className="absolute right-0 z-10 flex items-center h-full gap-0.5 px-0.5 bg-gradient-to-l from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900">
        {onPrevStep && (rowStatus === 'active' ? activeStepIndex > 0 : true) && (
          <button
            onClick={(e) => onActionClick(e, 'prev')}
            className={`${btnClass} text-gray-400 hover:text-brand-600`}
            title="이전 단계로 복구"
          >
            <SkipBack className={`${iconClass} fill-current`} />
          </button>
        )}

        {rowStatus === 'active' && activeStepIndex === 0 && onClearBed && (
          <button
            onClick={(e) => onActionClick(e, 'clear')}
            className={`${btnClass} text-gray-400 hover:text-red-600`}
            title="침상 비우기"
          >
            <X className={iconClass} />
          </button>
        )}

        {rowStatus === 'active' && onAddStep && quickTreatments.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAddPopupPos({ x: e.clientX, y: e.clientY });
            }}
            className={`${btnClass} text-gray-400 hover:text-emerald-600`}
            title="처방 단계 추가"
          >
            <Plus className={iconClass} />
          </button>
        )}

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

      {addPopupPos && onAddStep && quickTreatments.length > 0 && (
        <StepReplacePopup
          quickTreatments={quickTreatments}
          clickPos={addPopupPos}
          onSelect={(qt) => {
            onAddStep(qt);
            setAddPopupPos(null);
          }}
          onClose={() => setAddPopupPos(null)}
        />
      )}
    </>
  );
});
