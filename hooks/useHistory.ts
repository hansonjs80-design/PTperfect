
import { useState, useCallback, useRef } from 'react';
import { BedState, PatientVisit } from '../types';

interface StateSnapshot {
  beds: BedState[];
  visits: PatientVisit[];
}

export const useHistory = (maxSize: number = 20) => {
  const [history, setHistory] = useState<StateSnapshot[]>([]);
  const lastSavedTime = useRef<number>(0);

  const saveSnapshot = useCallback((beds: BedState[], visits: PatientVisit[]) => {
    // 1초 이내의 연속적인 변화는 무시 (성능 최적화)
    const now = Date.now();
    if (now - lastSavedTime.current < 1000) return;
    
    lastSavedTime.current = now;
    
    // 깊은 복사를 통해 현재 상태 저장
    const snapshot: StateSnapshot = {
      beds: JSON.parse(JSON.stringify(beds)),
      visits: JSON.parse(JSON.stringify(visits))
    };

    setHistory(prev => {
      const newHistory = [snapshot, ...prev];
      return newHistory.slice(0, maxSize);
    });
  }, [maxSize]);

  const popSnapshot = useCallback(() => {
    if (history.length === 0) return null;
    const [lastState, ...remaining] = history;
    setHistory(remaining);
    return lastState;
  }, [history]);

  const canUndo = history.length > 0;

  return { saveSnapshot, popSnapshot, canUndo };
};
