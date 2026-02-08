
import React, { createContext, useContext, ReactNode, useRef, useEffect, useCallback, useMemo } from 'react';
import { BedState, Preset, TreatmentStep, PatientVisit, BedStatus, QuickTreatment } from '../types';
import { usePresetManager } from '../hooks/usePresetManager';
import { useQuickTreatmentManager } from '../hooks/useQuickTreatmentManager';
import { useBedManager } from '../hooks/useBedManager';
import { useNotificationBridge } from '../hooks/useNotificationBridge';
import { usePatientLogContext } from './PatientLogContext';
import { useTreatmentSettings } from '../hooks/useTreatmentSettings';
import { useTreatmentUI } from '../hooks/useTreatmentUI';

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
  
  // 2. Settings & UI State Hooks (Separated)
  const settings = useTreatmentSettings();
  const uiState = useTreatmentUI();

  // 3. Patient Log Integration
  const { visits, addVisit, updateVisit: updateLogVisit } = usePatientLogContext();
  const visitsRef = useRef(visits);
  
  useEffect(() => {
    visitsRef.current = visits;
  }, [visits]);

  // Handler to sync bed status changes (Bed -> Log)
  const handleLogUpdate = useCallback((bedId: number, updates: Partial<PatientVisit>) => {
     const currentVisits = visitsRef.current;
     const bedVisits = currentVisits.filter(v => v.bed_id === bedId);
     
     // Sort by created_at to guarantee we pick the latest session
     bedVisits.sort((a, b) => (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()));

     if (bedVisits.length > 0) {
        const lastVisit = bedVisits[bedVisits.length - 1];
        updateLogVisit(lastVisit.id, updates);
     }
  }, [updateLogVisit]);

  // 4. Bed Logic Manager
  const bedManager = useBedManager(
      presets,
      quickTreatments,
      settings.isSoundEnabled, 
      settings.isBackgroundKeepAlive,
      addVisit, 
      handleLogUpdate
  );

  // Destructure bedManager actions to allow stable referencing in callbacks
  const { 
    beds, 
    clearBed, 
    overrideBedFromLog, 
    moveBedState,
    nextStep 
  } = bedManager;

  const bedsRef = useRef(beds);
  useEffect(() => {
    bedsRef.current = beds;
  }, [beds]);

  // 5. Cross-Domain Logic (Bed <-> Log Sync)
  const updateVisitWithBedSync = useCallback(async (id: string, updates: Partial<PatientVisit>, skipBedSync: boolean = false) => {
      const oldVisit = visitsRef.current.find(v => v.id === id);
      if (!oldVisit) return;

      let shouldForceRestart = false;

      // Conflict Check 1: Bed Assignment Change
      const targetBedId = updates.bed_id !== undefined ? updates.bed_id : oldVisit.bed_id;
      
      if (!skipBedSync && targetBedId) {
         // Case A: Moving/Assigning Bed
         const isBedAssignmentChange = updates.bed_id !== undefined && updates.bed_id !== oldVisit.bed_id;
         
         if (isBedAssignmentChange) {
             const targetBed = bedsRef.current.find(b => b.id === targetBedId);
             if (targetBed && targetBed.status === BedStatus.ACTIVE) {
                 if (!window.confirm(`${targetBedId}번 배드는 비어있지 않습니다.\n배드카드를 비우고 입력할까요?`)) {
                     return;
                 }
                 shouldForceRestart = true;
             }
         }
         
         // Case B: Updating Treatment on Same Bed (New Logic)
         // Only trigger if treatment_name is part of the update and changes
         if (updates.treatment_name !== undefined && updates.treatment_name !== oldVisit.treatment_name) {
             const targetBed = bedsRef.current.find(b => b.id === targetBedId);
             // If target bed is ACTIVE and we are changing the treatment via the modal (skipBedSync is false)
             if (targetBed && targetBed.status === BedStatus.ACTIVE) {
                 if (!window.confirm(`${targetBedId}번 배드는 비어있지 않습니다.\n배드카드를 비우고 입력할까요?`)) {
                     return;
                 }
                 shouldForceRestart = true;
             }
         }
      }

      await updateLogVisit(id, updates);

      if (skipBedSync) return;

      const mergedVisit = { ...oldVisit, ...updates };

      if (oldVisit.bed_id && updates.bed_id === null) {
          clearBed(oldVisit.bed_id); 
          return;
      }

      if (mergedVisit.bed_id) {
          if (oldVisit.bed_id && updates.bed_id && oldVisit.bed_id !== updates.bed_id) {
             clearBed(oldVisit.bed_id);
             shouldForceRestart = true;
          }
          overrideBedFromLog(mergedVisit.bed_id, mergedVisit, shouldForceRestart);
      }
  }, [updateLogVisit, clearBed, overrideBedFromLog]); // Stable deps

  const movePatient = useCallback(async (fromBedId: number, toBedId: number) => {
    if (fromBedId === toBedId) return;

    const targetBed = bedsRef.current.find(b => b.id === toBedId);
    if (targetBed && targetBed.status === BedStatus.ACTIVE) {
        if (!window.confirm(`${toBedId}번 배드는 현재 활성화 되어있습니다. 그래도 진행하시겠습니까?\n(기존 내용을 비우고 해당 항목으로 변경됩니다)`)) {
            return;
        }
    }

    const sourceBed = bedsRef.current.find(b => b.id === fromBedId);
    const isSourceActive = sourceBed && sourceBed.status === BedStatus.ACTIVE;

    const visitsForBed = visitsRef.current.filter(v => v.bed_id === fromBedId);
    visitsForBed.sort((a, b) => (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()));
    const latestVisit = visitsForBed[visitsForBed.length - 1];

    if (isSourceActive) {
      await moveBedState(fromBedId, toBedId);
      if (latestVisit) {
        await updateLogVisit(latestVisit.id, { bed_id: toBedId }); 
      }
    } else if (latestVisit) {
      await updateLogVisit(latestVisit.id, { bed_id: toBedId });
      const updatedVisit = { ...latestVisit, bed_id: toBedId };
      clearBed(fromBedId);
      overrideBedFromLog(toBedId, updatedVisit, true);
    } else {
       alert(`${fromBedId}번 배드는 비어있어 이동할 데이터가 없습니다.`);
    }
  }, [moveBedState, updateLogVisit, clearBed, overrideBedFromLog]); // Stable deps

  useNotificationBridge(nextStep);

  const value = {
    presets,
    updatePresets,
    quickTreatments,
    updateQuickTreatments,
    ...settings,
    ...uiState,
    ...bedManager, // Spread bedManager to provide beds and other actions
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
