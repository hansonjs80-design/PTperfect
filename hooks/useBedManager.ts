
import { useEffect, useCallback, useState, useRef } from 'react';
import { BedState, BedStatus, Preset, TreatmentStep } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { TOTAL_BEDS, STANDARD_TREATMENTS } from '../constants';
import { supabase, isOnlineMode } from '../lib/supabase';
import { useBedTimer } from './useBedTimer';
import { useBedRealtime } from './useBedRealtime';
import { useWakeLock } from './useWakeLock';
import { mapBedToDbPayload, calculateRemainingTime } from '../utils/bedLogic';
import { useBedState } from './useBedState'; // Import useBedState
import { useBedActions } from './useBedActions';
import { useBedControls } from './useBedControls';
import { useBedIntegration } from './useBedIntegration';

export const useBedManager = (
  presets: Preset[],
  quickTreatments: any[], // Type tweak to avoid circular dep issues if any
  isSoundEnabled: boolean,
  isBackgroundKeepAlive: boolean,
  onAddVisit?: (data?: any) => Promise<string>,
  onUpdateVisit?: (bedId: number, updates: any) => void
) => {
  // 1. Core State Management
  const { beds, bedsRef, updateBedState, clearBedInDb, restoreBeds, refreshBeds, broadcastClearBed, realtimeStatus } = useBedState(presets, isSoundEnabled, isBackgroundKeepAlive);

  // 2. Runtime Controls (Pause, Next, Clear, Flags)
  const controls = useBedControls(bedsRef, updateBedState, presets, onUpdateVisit);

  // 3. Treatment Starting Actions (Presets, Traction, Quick)
  const actions = useBedActions(updateBedState, presets, onAddVisit);

  // 4. Complex Integration Logic (Log Override, Moving Beds)
  const integration = useBedIntegration(
    bedsRef,
    updateBedState,
    presets,
    quickTreatments,
    controls.clearBed,
    onUpdateVisit
  );

  // 5. Facade: Expose unified API
  return {
    beds,
    // From Actions
    selectPreset: actions.selectPreset,
    startCustomPreset: actions.startCustomPreset,
    startQuickTreatment: actions.startQuickTreatment,
    startTraction: actions.startTraction,
    // From Controls
    nextStep: controls.nextStep,
    prevStep: controls.prevStep,
    swapSteps: controls.swapSteps,
    togglePause: controls.togglePause,
    toggleInjection: (id: number) => controls.toggleFlag(id, 'isInjection'),
    toggleFluid: (id: number) => controls.toggleFlag(id, 'isFluid'),
    toggleTraction: (id: number) => controls.toggleFlag(id, 'isTraction'),
    toggleESWT: (id: number) => controls.toggleFlag(id, 'isESWT'),
    toggleManual: (id: number) => controls.toggleFlag(id, 'isManual'),
    toggleInjectionCompleted: (id: number) => controls.toggleFlag(id, 'isInjectionCompleted'),
    updatePatientMemo: controls.updatePatientMemo,
    updateBedDuration: controls.updateBedDuration,
    clearBed: (bedId: number) => {
      controls.clearBed(bedId);       // 로컬 UI 즉시 업데이트
      clearBedInDb(bedId);            // DB 직접 upsert (3회 재시도)
      broadcastClearBed(bedId);       // 다른 디바이스에 알림
    },
    resetAll: () => bedsRef.current.forEach(bed => {
      controls.clearBed(bed.id);
      clearBedInDb(bed.id);
      broadcastClearBed(bed.id);
    }),
    // From Integration
    updateBedSteps: integration.updateBedSteps,
    overrideBedFromLog: integration.overrideBedFromLog,
    moveBedState: integration.moveBedState,

    // Core & Utils
    updateBedState,
    restoreBeds, // EXPOSED
    refreshBeds, // EXPOSED
    jumpToStep: (bedId: number, stepIndex: number) => { },
    realtimeStatus
  };
};
