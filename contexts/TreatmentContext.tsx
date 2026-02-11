
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
  layoutMode: 'default' | 'alt' | 'option3';
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
  
  // Undo/Redo System
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  canUndo: boolean;
  canRedo: boolean;
  
  // Exposed for Log Component usage
  updateVisitWithBedSync: (id: string, updates: Partial<PatientVisit>, skipBedSync?: boolean) => Promise<void>;
}

const TreatmentContext = createContext<TreatmentContextType | undefined>(undefined);

export const TreatmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { presets, updatePresets } = usePresetManager();
  const { quickTreatments, updateQuickTreatments } = useQuickTreatmentManager();
  const settings = useTreatmentSettings();
  const uiState = useTreatmentUI();
  const { visits, addVisit, updateVisit: updateLogVisit, setVisits } = usePatientLogContext();
  const { saveSnapshot, undoOp, redoOp, canUndo, canRedo } = useHistory(20);

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

  const { 
    beds, 
    updateBedState,
    restoreBeds, 
    // Destructure original actions to wrap them with snapshot logic
    selectPreset: _selectPreset,
    startCustomPreset: _startCustomPreset,
    startQuickTreatment: _startQuickTreatment,
    startTraction: _startTraction,
    nextStep: _nextStep,
    prevStep: _prevStep,
    swapSteps: _swapSteps,
    togglePause: _togglePause,
    clearBed: _clearBed,
    toggleInjection: _toggleInjection,
    toggleFluid: _toggleFluid,
    toggleTraction: _toggleTraction,
    toggleESWT: _toggleESWT,
    toggleManual: _toggleManual,
    updateBedSteps: _updateBedSteps
  } = bedManager;

  const bedsRef = useRef(beds);
  useEffect(() => { bedsRef.current = beds; }, [beds]);

  const { handleLogUpdate, movePatient: _movePatient, updateVisitWithBedSync } = usePatientBedSync(
    bedsRef,
    visitsRef,
    updateLogVisit,
    _clearBed,
    bedManager
  );

  useEffect(() => {
    logUpdateHandlerRef.current = handleLogUpdate;
  }, [handleLogUpdate]);

  // --- Snapshot Wrappers for Actions ---
  
  const withSnapshot = useCallback((action: (...args: any[]) => void) => {
    return (...args: any[]) => {
      saveSnapshot(bedsRef.current, visitsRef.current);
      action(...args);
    };
  }, [saveSnapshot]);

  const selectPreset = withSnapshot(_selectPreset);
  const startCustomPreset = withSnapshot(_startCustomPreset);
  const startQuickTreatment = withSnapshot(_startQuickTreatment);
  const startTraction = withSnapshot(_startTraction);
  const nextStep = withSnapshot(_nextStep);
  const prevStep = withSnapshot(_prevStep);
  const swapSteps = withSnapshot(_swapSteps);
  const togglePause = withSnapshot(_togglePause); 
  const clearBed = withSnapshot(_clearBed);
  
  const toggleInjection = withSnapshot(_toggleInjection);
  const toggleFluid = withSnapshot(_toggleFluid);
  const toggleTraction = withSnapshot(_toggleTraction);
  const toggleESWT = withSnapshot(_toggleESWT);
  const toggleManual = withSnapshot(_toggleManual);
  const updateBedSteps = withSnapshot(_updateBedSteps);

  const resetAll = useCallback(() => {
    saveSnapshot(bedsRef.current, visitsRef.current);
    bedsRef.current.forEach(bed => _clearBed(bed.id));
  }, [_clearBed, saveSnapshot]);

  const movePatient = useCallback(async (fromBedId: number, toBedId: number) => {
    saveSnapshot(bedsRef.current, visitsRef.current);
    await _movePatient(fromBedId, toBedId);
  }, [_movePatient, saveSnapshot]);


  // --- Undo Logic ---
  const undo = useCallback(async () => {
    // Pass current state to save it into 'future' stack before restoring 'past'
    const prevState = undoOp(bedsRef.current, visitsRef.current);
    if (!prevState) return false;

    await restoreBeds(prevState.beds);
    setVisits(prevState.visits);
    
    if (isOnlineMode() && supabase) {
      const rows = prevState.visits.map(v => ({...v, updated_at: new Date().toISOString()}));
      if (rows.length > 0) {
        await supabase.from('patient_visits').upsert(rows);
      }
    }
    return true;
  }, [undoOp, restoreBeds, setVisits]);

  // --- Redo Logic ---
  const redo = useCallback(async () => {
    // Pass current state to save it into 'history' stack before restoring 'future'
    const nextState = redoOp(bedsRef.current, visitsRef.current);
    if (!nextState) return false;

    await restoreBeds(nextState.beds);
    setVisits(nextState.visits);

    if (isOnlineMode() && supabase) {
      const rows = nextState.visits.map(v => ({...v, updated_at: new Date().toISOString()}));
      if (rows.length > 0) {
        await supabase.from('patient_visits').upsert(rows);
      }
    }
    return true;
  }, [redoOp, restoreBeds, setVisits]);

  useNotificationBridge(nextStep); 

  const value = {
    presets,
    updatePresets,
    quickTreatments,
    updateQuickTreatments,
    ...settings,
    ...uiState,
    ...bedManager, 
    selectPreset,
    startCustomPreset,
    startQuickTreatment,
    startTraction,
    nextStep,
    prevStep,
    swapSteps,
    togglePause,
    toggleInjection,
    toggleFluid,
    toggleTraction,
    toggleESWT,
    toggleManual,
    updateBedSteps,
    clearBed,
    resetAll,
    movePatient,
    updateVisitWithBedSync,
    undo,
    redo,
    canUndo,
    canRedo
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
