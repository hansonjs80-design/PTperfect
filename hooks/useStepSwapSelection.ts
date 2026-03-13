import { useCallback, useEffect, useRef, useState } from 'react';
import { TreatmentStep } from '../types';

const MOVE_COOLDOWN_MS = 60;


const SWAP_SELECTION_EVENT = 'bed-swap-selection-changed';

const emitSwapSelectionChange = (bedId: number | null) => {
  window.dispatchEvent(new CustomEvent<number | null>(SWAP_SELECTION_EVENT, { detail: bedId }));
};

export const useStepSwapSelection = (
  bedId: number,
  swapSteps: (id: number, idx1: number, idx2: number) => void
) => {
  const [swapSourceStepId, setSwapSourceStepId] = useState<string | null>(null);
  const lastMoveTsRef = useRef(0);

  useEffect(() => {
    const onSwapSelectionChange = (event: Event) => {
      const detail = (event as CustomEvent<number | null>).detail;
      if (detail !== bedId) {
        setSwapSourceStepId(null);
      }
    };

    const onGlobalPointerDown = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const inSwapScope = !!target.closest('[data-swap-scope="true"]');
      const inSwapCell = !!target.closest('[data-swap-cell="true"]');
      const keepSelectionArea = !!target.closest('[data-keep-swap-selection="true"]');

      // 스텝 셀 및 하단 스왑 컨트롤 영역에서는 선택 유지
      if ((inSwapScope && inSwapCell) || keepSelectionArea) return;

      // 헤더 버튼, +버튼, 환자현황창 셀 클릭, 빈 공간 클릭 등은 선택 해제
      setSwapSourceStepId(null);
      emitSwapSelectionChange(null);
    };

    window.addEventListener(SWAP_SELECTION_EVENT, onSwapSelectionChange as EventListener);
    document.addEventListener('pointerdown', onGlobalPointerDown, true);

    return () => {
      window.removeEventListener(SWAP_SELECTION_EVENT, onSwapSelectionChange as EventListener);
      document.removeEventListener('pointerdown', onGlobalPointerDown, true);
    };
  }, [bedId]);

  const getSelectedSwapIndex = useCallback((steps: TreatmentStep[]) => {
    if (!swapSourceStepId) return null;
    const idx = steps.findIndex((step) => step.id === swapSourceStepId);
    return idx >= 0 ? idx : null;
  }, [swapSourceStepId]);

  const handleSwapRequest = useCallback((targetBedId: number, idx: number, steps: TreatmentStep[]) => {
    const targetStep = steps[idx];
    if (!targetStep) return;

    const selectedIdx = getSelectedSwapIndex(steps);
    if (selectedIdx === null) {
      setSwapSourceStepId(targetStep.id);
      emitSwapSelectionChange(bedId);
      return;
    }

    if (selectedIdx !== idx) {
      swapSteps(targetBedId, selectedIdx, idx);
    }
    setSwapSourceStepId(null);
    emitSwapSelectionChange(null);
  }, [bedId, getSelectedSwapIndex, swapSteps]);

  const handleMoveSelectedStep = useCallback((direction: 'left' | 'right', steps: TreatmentStep[]) => {
    const now = Date.now();
    if (now - lastMoveTsRef.current < MOVE_COOLDOWN_MS) return;

    const selectedIdx = getSelectedSwapIndex(steps);
    if (selectedIdx === null) return;

    const targetIndex = direction === 'left' ? selectedIdx - 1 : selectedIdx + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    lastMoveTsRef.current = now;
    swapSteps(bedId, selectedIdx, targetIndex);
  }, [bedId, getSelectedSwapIndex, swapSteps]);

  const clearSwapSelection = useCallback(() => {
    setSwapSourceStepId(null);
    emitSwapSelectionChange(null);
  }, []);

  return {
    swapSourceStepId,
    getSelectedSwapIndex,
    handleSwapRequest,
    handleMoveSelectedStep,
    clearSwapSelection,
  };
};
