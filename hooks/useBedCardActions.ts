
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BedStatus, TreatmentStep } from '../types';

export const useBedCardActions = (
  bedStatus: BedStatus,
  bedId: number,
  clearBed: (id: number) => void,
  swapSteps: (id: number, idx1: number, idx2: number) => void
) => {
  const [trashState, setTrashState] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [swapSourceStepId, setSwapSourceStepId] = useState<string | null>(null);
  const lastMoveTsRef = useRef(0);
  const MOVE_COOLDOWN_MS = 120;

  useEffect(() => {
    if (bedStatus === BedStatus.IDLE) {
      setTrashState('idle');
      setSwapSourceStepId(null);
    }
  }, [bedStatus]);

  const handleTrashClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (trashState === 'idle') {
      setTrashState('confirm');
      setTimeout(() => setTrashState(prev => prev === 'confirm' ? 'idle' : prev), 3000);
    } else if (trashState === 'confirm') {
      setTrashState('deleting');
      requestAnimationFrame(() => {
        clearBed(bedId);
      });
    }
  }, [trashState, bedId, clearBed]);

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
  }, [getSelectedSwapIndex, swapSteps, bedId]);

  const cancelSwap = useCallback(() => {
    setSwapSourceStepId(null);
  }, []);

  return {
    trashState,
    handleTrashClick,
    swapSourceStepId,
    getSelectedSwapIndex,
    handleSwapRequest,
    handleMoveSelectedStep,
    cancelSwap
  };
};
