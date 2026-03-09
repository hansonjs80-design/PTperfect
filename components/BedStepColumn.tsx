
import React, { memo, useState, useCallback, useRef } from 'react';
import { TreatmentStep, QuickTreatment } from '../types';
import { getStepLabel } from '../utils/bedUtils';
import { getStepColor } from '../utils/styleUtils';
import { StepReplacePopup } from './bed-card/StepReplacePopup';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface BedStepColumnProps {
  step: TreatmentStep;
  index: number;
  isActive: boolean;
  isPast: boolean;
  isCompleted: boolean;
  isSelectedForSwap: boolean;
  bedId: number;
  onSwapRequest?: (id: number, idx: number) => void;
  onMoveSelectedStep?: (direction: 'left' | 'right') => void;
  totalSteps?: number;
  onReplaceStep?: (idx: number, qt: QuickTreatment) => void;
  quickTreatments?: QuickTreatment[];
  onOpenTreatmentSelector?: (bedId: number) => void;
  onOpenBedEdit?: (bedId: number) => void;
  onDeleteSelectedStep?: () => void;
  onCancelSelection?: () => void;
}

export const BedStepColumn: React.FC<BedStepColumnProps> = memo(({
  step,
  index,
  isActive,
  isPast,
  isCompleted,
  isSelectedForSwap,
  bedId,
  onSwapRequest,
  onMoveSelectedStep,
  totalSteps = 0,
  onReplaceStep,
  quickTreatments,
  onOpenTreatmentSelector,
  onOpenBedEdit,
  onDeleteSelectedStep,
  onCancelSelection
}) => {
  const [replacePopup, setReplacePopup] = useState<{ x: number; y: number } | null>(null);
  const colorClass = getStepColor(step, isActive, isPast, false, isCompleted);
  const lastTouchTapRef = useRef<number>(0);
  const isDesktopOrTablet = useMediaQuery('(min-width: 768px)');
  const isTouchLayout = useMediaQuery('(max-width: 1024px)');
  const isCoarsePointer = useMediaQuery('(pointer: coarse)');

  const canOpenQuickReplace = !!onReplaceStep && !!quickTreatments?.length;

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isDesktopOrTablet || !onReplaceStep || !quickTreatments?.length) return;
    e.preventDefault();
    e.stopPropagation();
    setReplacePopup({ x: e.clientX, y: e.clientY });
  };


  const handleStepDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 태블릿/모바일 더블탭(또는 빠른 더블클릭)은 우클릭과 동일하게 단일 처방 교체 팝업을 연다.
    if (isTouchLayout && canOpenQuickReplace) {
      setReplacePopup({ x: e.clientX, y: e.clientY });
      return;
    }

    if (onOpenBedEdit) {
      onOpenBedEdit(bedId);
      return;
    }
    onOpenTreatmentSelector?.(bedId);
  };


  const handleStepKeyActions = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isSelectedForSwap) return;

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      e.stopPropagation();
      onDeleteSelectedStep?.();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancelSelection?.();
    }
  }, [isSelectedForSwap, onDeleteSelectedStep, onCancelSelection]);

  const handleSwapInteraction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSwapRequest && onSwapRequest(bedId, index);
  };

  const handleSwapPointerDown = (e: React.PointerEvent) => {
    // 모바일/태블릿(터치 계열)은 pointerdown에서 즉시 선택 반영해 체감 지연을 줄인다.
    if (e.pointerType === 'mouse') return;

    // 터치 환경에서는 빠른 더블탭 시 단일 처방 교체 팝업을 즉시 연다.
    if (isCoarsePointer && isTouchLayout && canOpenQuickReplace) {
      const now = Date.now();
      const diff = now - lastTouchTapRef.current;

      if (diff > 0 && diff < 320) {
        e.preventDefault();
        e.stopPropagation();
        setReplacePopup({ x: e.clientX, y: e.clientY });
        lastTouchTapRef.current = 0;
        return;
      }

      lastTouchTapRef.current = now;
    }

    e.preventDefault();
    e.stopPropagation();
    onSwapRequest && onSwapRequest(bedId, index);
  };

  return (
    <>
      <div
        data-swap-cell="true"
        className={`
          flex-1 flex flex-col h-full min-w-0 group/col relative transition-all duration-300
          ${isActive ? 'z-10 shadow-md transform scale-[1.02] rounded-lg my-[-1px]' : ''}
          ${isSelectedForSwap ? 'z-20 sm:scale-100 scale-[0.98]' : ''}
        `}
        onPointerDown={handleSwapPointerDown}
        onClick={handleSwapInteraction}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleStepDoubleClick}
        onKeyDown={handleStepKeyActions}
        tabIndex={isSelectedForSwap ? 0 : -1}
      >
        {/* Step Visual Block */}
        <div className={`
            flex-1 flex flex-col items-center justify-center p-0.5 sm:p-0.5 relative overflow-hidden transition-all duration-200
            ${colorClass}
            ${isSelectedForSwap ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 rounded-md border-2 border-indigo-500/80' : ''}
        `}>
          <span className={`font-black text-base xs:text-lg sm:text-2xl md:text-[28px] lg:text-3xl leading-none text-center whitespace-nowrap px-0.5 ${isActive ? 'scale-110 drop-shadow-sm' : 'opacity-90'}`}>
            {getStepLabel(step)}
          </span>

          {isActive && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />}

        </div>
      </div>

      {replacePopup && quickTreatments && onReplaceStep && (
        <StepReplacePopup
          quickTreatments={quickTreatments}
          clickPos={replacePopup}
          onSelect={(qt) => {
            onReplaceStep(index, qt);
            setReplacePopup(null);
          }}
          onClose={() => setReplacePopup(null)}
        />
      )}
    </>
  );
});
