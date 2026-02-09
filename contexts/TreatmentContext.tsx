
import React, { createContext, useContext, ReactNode, useRef, useEffect } from 'react';
import { BedState, Preset, TreatmentStep, PatientVisit, QuickTreatment } from '../types';
import { usePresetManager } from '../hooks/usePresetManager';
import { useQuickTreatmentManager } from '../hooks/useQuickTreatmentManager';
import { useBedManager } from '../hooks/useBedManager';
import { useNotificationBridge } from '../hooks/useNotificationBridge';
import { usePatientLogContext } from './PatientLogContext';
import { useTreatmentSettings } from '../hooks/useTreatmentSettings';
import { useTreatmentUI } from '../hooks/useTreatmentUI';
import { usePatientBedSync } from '../hooks/usePatientBedSync';

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
  
  // Exposed for Log Component usage
  updateVisitWithBedSync: (id: string, updates: Partial<PatientVisit>, skipBedSync?: boolean) => Promise<void>;
}

const TreatmentContext = createContext<TreatmentContextType | undefined>(undefined);

export const TreatmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Core Data Managers
  const { presets, updatePresets } = usePresetManager();
  const { quickTreatments, updateQuickTreatments } = useQuickTreatmentManager();
  
  // 2. Settings & UI State Hooks
  const settings = useTreatmentSettings();
  const uiState = useTreatmentUI();

  // 3. Patient Log Integration
  const { visits, addVisit, updateVisit: updateLogVisit } = usePatientLogContext();
  const visitsRef = useRef(visits);
  
  useEffect(() => {
    visitsRef.current = visits;
  }, [visits]);

  // Placeholder for circular dependency resolution
  // We need to pass a handler to useBedManager, but useBedManager creates the bedsRef we need for the handler.
  // We use a mutable ref for the handler and update it after hooks are initialized.
  const logUpdateHandlerRef = useRef<(bedId: number, updates: Partial<PatientVisit>) => void>(() => {});

  // 4. Bed Logic Manager
  const bedManager = useBedManager(
      presets,
      quickTreatments,
      settings.isSoundEnabled, 
      settings.isBackgroundKeepAlive,
      addVisit, 
      (bedId, updates) => logUpdateHandlerRef.current(bedId, updates)
  );

  const { beds, clearBed, nextStep } = bedManager;
  const bedsRef = useRef(beds);
  useEffect(() => {
    bedsRef.current = beds;
  }, [beds]);

  // 5. Complex Synchronization Logic (Extracted Hook)
  const { handleLogUpdate, movePatient, updateVisitWithBedSync } = usePatientBedSync(
    bedsRef,
    visitsRef,
    updateLogVisit,
    clearBed,
    bedManager // Pass the integration methods from bedManager
  );

  // Update the ref so bedManager can call it
  useEffect(() => {
    logUpdateHandlerRef.current = handleLogUpdate;
  }, [handleLogUpdate]);

  useNotificationBridge(nextStep);

  const value = {
    presets,
    updatePresets,
    quickTreatments,
    updateQuickTreatments,
    ...settings,
    ...uiState,
    ...bedManager, 
    movePatient,
    updateVisitWithBedSync
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
