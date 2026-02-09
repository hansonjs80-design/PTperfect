
import React, { useState, useEffect, useCallback } from 'react';
import { BedStatus } from '../types';

export const useBedCardActions = (
  bedStatus: BedStatus,
  bedId: number,
  clearBed: (id: number) => void,
  swapSteps: (id: number, idx1: number, idx2: number) => void
) => {
  const [trashState, setTrashState] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [swapSourceIndex, setSwapSourceIndex] = useState<number | null>(null);

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
    if (swapSourceIndex === null) {
      // First click: Select source
      setSwapSourceIndex(idx);
    } else {
      // Second click: Execute swap or cancel if same
      if (swapSourceIndex !== idx) {
        swapSteps(targetBedId, swapSourceIndex, idx);
      }
      setSwapSourceIndex(null);
    }
  }, [swapSourceIndex, swapSteps]);

  return {
    trashState,
    handleTrashClick,
    swapSourceIndex,
    handleSwapRequest
  };
};
