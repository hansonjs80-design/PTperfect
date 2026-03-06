import React, { useState, useEffect, useCallback } from 'react';
import { BedStatus } from '../types';
import { useStepSwapSelection } from './useStepSwapSelection';

export const useBedCardActions = (
  bedStatus: BedStatus,
  bedId: number,
  clearBed: (id: number) => void,
  swapSteps: (id: number, idx1: number, idx2: number) => void
) => {
  const [trashState, setTrashState] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const {
    swapSourceStepId,
    getSelectedSwapIndex,
    handleSwapRequest,
    handleMoveSelectedStep,
    clearSwapSelection,
  } = useStepSwapSelection(bedId, swapSteps);

  useEffect(() => {
    if (bedStatus === BedStatus.IDLE) {
      setTrashState('idle');
      clearSwapSelection();
    }
  }, [bedStatus, clearSwapSelection]);

  const handleTrashClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  return {
    trashState,
    handleTrashClick,
    swapSourceStepId,
    getSelectedSwapIndex,
    handleSwapRequest,
    handleMoveSelectedStep,
    cancelSwap: clearSwapSelection,
  };
};
