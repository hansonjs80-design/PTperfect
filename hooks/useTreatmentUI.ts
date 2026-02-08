
import { useState } from 'react';

interface MovingPatientState {
  bedId: number;
  x: number;
  y: number;
}

export const useTreatmentUI = () => {
  const [selectingBedId, setSelectingBedId] = useState<number | null>(null);
  const [selectingLogId, setSelectingLogId] = useState<string | null>(null);
  const [editingBedId, setEditingBedId] = useState<number | null>(null);
  const [movingPatientState, setMovingPatientState] = useState<MovingPatientState | null>(null);

  return {
    selectingBedId,
    setSelectingBedId,
    selectingLogId,
    setSelectingLogId,
    editingBedId,
    setEditingBedId,
    movingPatientState,
    setMovingPatientState
  };
};
