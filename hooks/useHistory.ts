
import { useState, useCallback } from 'react';
import { BedState, PatientVisit } from '../types';

interface StateSnapshot {
  beds: BedState[];
  visits: PatientVisit[];
}

export const useHistory = (maxSize: number = 20) => {
  const [history, setHistory] = useState<StateSnapshot[]>([]);
  const [future, setFuture] = useState<StateSnapshot[]>([]);

  // Action Performed: Save current state to history, clear future
  const saveSnapshot = useCallback((beds: BedState[], visits: PatientVisit[]) => {
    const snapshot: StateSnapshot = {
      beds: JSON.parse(JSON.stringify(beds)),
      visits: JSON.parse(JSON.stringify(visits))
    };

    setHistory(prev => {
      const newHistory = [snapshot, ...prev];
      if (newHistory.length > maxSize) {
        return newHistory.slice(0, maxSize);
      }
      return newHistory;
    });
    // Creating a new timeline branch clears the future
    setFuture([]);
  }, [maxSize]);

  // Undo: Move current state to future, pop from history
  const undoOp = useCallback((currentBeds: BedState[], currentVisits: PatientVisit[]) => {
    if (history.length === 0) return null;

    const [pastState, ...remainingHistory] = history;
    
    // Save current state to future before restoring past
    const currentSnapshot: StateSnapshot = {
        beds: JSON.parse(JSON.stringify(currentBeds)),
        visits: JSON.parse(JSON.stringify(currentVisits))
    };

    setFuture(prev => [currentSnapshot, ...prev]);
    setHistory(remainingHistory);

    return pastState;
  }, [history]);

  // Redo: Move current state to history, pop from future
  const redoOp = useCallback((currentBeds: BedState[], currentVisits: PatientVisit[]) => {
    if (future.length === 0) return null;

    const [nextState, ...remainingFuture] = future;

    // Save current state to history before restoring future
    const currentSnapshot: StateSnapshot = {
        beds: JSON.parse(JSON.stringify(currentBeds)),
        visits: JSON.parse(JSON.stringify(currentVisits))
    };

    setHistory(prev => [currentSnapshot, ...prev]);
    setFuture(remainingFuture);

    return nextState;
  }, [future]);

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  return { saveSnapshot, undoOp, redoOp, canUndo, canRedo };
};
