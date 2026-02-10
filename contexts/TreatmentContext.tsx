
import React, { createContext, useContext, ReactNode, useRef, useEffect, useCallback } from 'react';
import { BedState, Preset, TreatmentStep, PatientVisit, QuickTreatment } from '../types';
import { usePresetManager } from '../hooks/usePresetManager';
import { useQuickTreatmentManager } from '../hooks/useQuickTreatmentManager';
import { useBedManager } from '../hooks/useBedManager';
import { useNotificationBridge } from '../hooks/useNotificationBridge';
import { usePatientLogContext } from './PatientLogContext';
import { useTreatmentSettings } from '../hooks/useTreatmentSettings';
import { useTreatmentUI } from '../hooks/useTreatmentUI';
import { usePatientBedSync } from '../hooks/usePatientBedSync';
import { useHistory } from '../hooks/useHistory';
import { supabase, isOnlineMode } from '../lib/supabase';
import { mapBedToDbPayload } from '../utils/bedLogic';

interface MovingPatientState {
  bedId: number;
  x: number;
  y: number;
}

interface TreatmentContextType {
  beds: BedState[];
  presets: Preset[];
  updatePresets: (presets: Preset[]) => void;
  quickTreatments: QuickTreatment[];
  updateQuickTreatments: (items: QuickTreatment[]) => void;
  
  // Settings
  isSoundEnabled: boolean;
  toggleSound: () => void;
  isBackgroundKeepAlive: boolean;
  toggleBackgroundKeepAlive: () => void;
  layoutMode: 'default' | 'alt';
  toggleLayoutMode: () => void;

  // UI State for Modals
  selectingBedId: number | null;
  setSelectingBedId: (id: number | null) => void;
  selectingLogId: string | null; 
  setSelectingLogId: (id: string | null) => void;
  editingBedId: number | null;
  setEditingBedId: (id: number | null) => void;
  
  // Patient Move State
  movingPatientState: MovingPatientState | null;
  setMovingPatientState: (state: MovingPatientState | null) => void;
  
  // Actions
  selectPreset: (bedId: number, presetId: string, options: any) => void;
  startCustomPreset: (bedId: number, name: string, steps: TreatmentStep[], options: any) => void;
  startQuickTreatment: (bedId: number, template: QuickTreatment, options: any) => void;
  startTraction: (bedId: number, duration: number, options: any) => void;
  nextStep: (bedId: number) => void;
  prevStep: (bedId: number) => void;
  swapSteps: (bedId: number, idx1: number, idx2: number) => void;
  togglePause: (bedId: number) => void;
  jumpToStep: (bedId: number, stepIndex: number) => void;
  toggleInjection: (bedId: number) => void;
  toggleFluid: (bedId: number) => void;
  toggleTraction: (bedId: number) => void;
  toggleESWT: (bedId: number) => void;
  toggleManual: (bedId: number) => void;
  updateBedSteps: (bedId: number, steps: TreatmentStep[]) => void;
  updateMemo: (bedId: number, stepIndex: number, memo: string | null) => void;
  updateBedDuration: (bedId: number, duration: number) => void;
  clearBed: (bedId: number) => void;
  resetAll: () => void;
  movePatient: (fromBedId: number, toBedId: number) => Promise<void>;
  
  // Undo System
  undo: () => Promise<boolean>;
  canUndo: boolean;
  
  // Exposed for Log Component usage
  updateVisitWithBedSync: (id: string, updates: Partial<PatientVisit>, skipBedSync?: boolean) => Promise<void>;
}

const TreatmentContext = createContext<TreatmentContextType | undefined>(undefined);

export const TreatmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { presets, updatePresets } = usePresetManager();
  const { quickTreatments, updateQuickTreatments } = useQuickTreatmentManager();
  const settings = useTreatmentSettings();
  const uiState = useTreatmentUI();
  const { visits, addVisit, updateVisit: updateLogVisit, setVisits, currentDate } = usePatientLogContext();
  const { saveSnapshot, popSnapshot, canUndo } = useHistory(20);

  const visitsRef = useRef(visits);
  useEffect(() => { visitsRef.current = visits; }, [visits]);

  const logUpdateHandlerRef = useRef<(bedId: number, updates: Partial<PatientVisit>) => void>(() => {});

  const bedManager = useBedManager(
      presets,
      quickTreatments,
      settings.isSoundEnabled, 
      settings.isBackgroundKeepAlive,
      addVisit, 
      (bedId, updates) => logUpdateHandlerRef.current(bedId, updates)
  );

  const { beds, clearBed, nextStep, updateBedState } = bedManager;
  const bedsRef = useRef(beds);
  useEffect(() => { bedsRef.current = beds; }, [beds]);

  const { handleLogUpdate, movePatient, updateVisitWithBedSync } = usePatientBedSync(
    bedsRef,
    visitsRef,
    updateLogVisit,
    clearBed,
    bedManager
  );

  useEffect(() => {
    logUpdateHandlerRef.current = handleLogUpdate;
  }, [handleLogUpdate]);

  // Snapshot before destructive actions
  const clearBedWithHistory = useCallback((id: number) => {
    saveSnapshot(bedsRef.current, visitsRef.current);
    clearBed(id);
  }, [clearBed, saveSnapshot]);

  const resetAllWithHistory = useCallback(() => {
    saveSnapshot(bedsRef.current, visitsRef.current);
    bedsRef.current.forEach(bed => clearBed(bed.id));
  }, [clearBed, saveSnapshot]);

  const undo = useCallback(async () => {
    const prevState = popSnapshot();
    if (!prevState) return false;

    // 1. Restore Beds (Local & DB)
    for (const bedState of prevState.beds) {
      await updateBedState(bedState.id, bedState);
    }

    // 2. Restore Visits (Local & DB)
    setVisits(prevState.visits);
    if (isOnlineMode() && supabase) {
      // 대량 복구는 복잡하므로, 가장 최신 상태를 Upsert 하는 방식으로 처리하거나 
      // 개별 방문 기록을 돌려놓습니다. 여기서는 단순화를 위해 개별 upsert 진행.
      const rows = prevState.visits.map(v => ({...v, updated_at: new Date().toISOString()}));
      await supabase.from('patient_visits').upsert(rows);
    }

    return true;
  }, [popSnapshot, updateBedState, setVisits]);

  useNotificationBridge(nextStep);

  const value = {
    presets,
    updatePresets,
    quickTreatments,
    updateQuickTreatments,
    ...settings,
    ...uiState,
    ...bedManager, 
    clearBed: clearBedWithHistory,
    resetAll: resetAllWithHistory,
    movePatient,
    updateVisitWithBedSync,
    undo,
    canUndo
  };

  return (
    <TreatmentContext.Provider value={value}>
      {children}
    </TreatmentContext.Provider>
  );
};

export const useTreatmentContext = () => {
  const context = useContext(TreatmentContext);
  if (context === undefined) {
    throw new Error('useTreatmentContext must be used within a TreatmentProvider');
  }
  return context;
};
