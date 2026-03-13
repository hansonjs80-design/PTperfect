
import { useState } from 'react';

interface MovingPatientState {
  bedId: number;
  x: number;
  y: number;
}

export const useTreatmentUI = () => {
  const [selectingBedId, setSelectingBedId] = useState<number | null>(null);
  const [selectingLogId, setSelectingLogId] = useState<string | null>(null);
  const [selectingAppendMode, setSelectingAppendMode] = useState(false);
  const [editingBedId, setEditingBedId] = useState<number | null>(null);
  const [movingPatientState, setMovingPatientState] = useState<MovingPatientState | null>(null);
  const [isPrintModalOpen, setPrintModalOpen] = useState(false);

  return {
    selectingBedId,
    setSelectingBedId,
    selectingLogId,
    setSelectingLogId,
    selectingAppendMode,
    setSelectingAppendMode,
    editingBedId,
    setEditingBedId,
    movingPatientState,
    setMovingPatientState,
    isPrintModalOpen,
    setPrintModalOpen
  };
};
