
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BedStatus } from '../types';

export const useBedCardActions = (
  bedStatus: BedStatus,
  bedId: number,
  clearBed: (id: number) => void,
  swapSteps: (id: number, idx1: number, idx2: number) => void
) => {
  const [trashState, setTrashState] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [swapSourceIndex, setSwapSourceIndex] = useState<number | null>(null);
  const lastMoveTsRef = useRef(0);
  const MOVE_COOLDOWN_MS = 120;

  useEffect(() => {
    if (bedStatus === BedStatus.IDLE) {
      setTrashState('idle');
      setSwapSourceIndex(null);
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

  const handleSwapRequest = useCallback((targetBedId: number, idx: number) => {
    setSwapSourceIndex((prev) => {
      if (prev === null) return idx;
      if (prev !== idx) {
        swapSteps(targetBedId, prev, idx);
      }
      return null;
    });
  }, [swapSteps]);

  const handleMoveSelectedStep = useCallback((direction: 'left' | 'right', totalSteps: number) => {
    const now = Date.now();
    if (now - lastMoveTsRef.current < MOVE_COOLDOWN_MS) return;

    setSwapSourceIndex((prev) => {
      if (prev === null) return prev;

      const targetIndex = direction === 'left' ? prev - 1 : prev + 1;
      if (targetIndex < 0 || targetIndex >= totalSteps) return prev;

      lastMoveTsRef.current = now;
      swapSteps(bedId, prev, targetIndex);
      return targetIndex;
    });
  }, [swapSteps, bedId]);

  const cancelSwap = useCallback(() => {
    setSwapSourceIndex(null);
  }, []);

  return {
    trashState,
    handleTrashClick,
    swapSourceIndex,
    handleSwapRequest,
    handleMoveSelectedStep,
    cancelSwap
  };
};
