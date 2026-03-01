import { useCallback, useRef, useState } from 'react';
import { TreatmentStep } from '../types';

const MOVE_COOLDOWN_MS = 120;

export const useStepSwapSelection = (
  bedId: number,
  swapSteps: (id: number, idx1: number, idx2: number) => void
) => {
  const [swapSourceStepId, setSwapSourceStepId] = useState<string | null>(null);
  const lastMoveTsRef = useRef(0);

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
      return;
    }

    if (selectedIdx !== idx) {
      swapSteps(targetBedId, selectedIdx, idx);
    }
    setSwapSourceStepId(null);
  }, [getSelectedSwapIndex, swapSteps]);

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
  }, []);

  return {
    swapSourceStepId,
    getSelectedSwapIndex,
    handleSwapRequest,
    handleMoveSelectedStep,
    clearSwapSelection,
  };
};
