
import { BedState, Preset, QuickTreatment, PatientVisit, TreatmentStep } from '../types';
import { useBedState } from './useBedState';
import { useBedActions } from './useBedActions';
import { useBedControls } from './useBedControls';
import { useBedIntegration } from './useBedIntegration';

export const useBedManager = (
  presets: Preset[], 
  quickTreatments: QuickTreatment[],
  isSoundEnabled: boolean,
  isBackgroundKeepAlive: boolean,
  onAddVisit?: (data?: Partial<PatientVisit>) => Promise<string>,
  onUpdateVisit?: (bedId: number, updates: Partial<PatientVisit>) => void
) => {
  // 1. Core State Management
  const { beds, bedsRef, updateBedState, realtimeStatus } = useBedState(presets, isSoundEnabled, isBackgroundKeepAlive);

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
    updateMemo: controls.updateMemo,
    updateBedDuration: controls.updateBedDuration,
    clearBed: controls.clearBed, 
    resetAll: () => bedsRef.current.forEach(bed => controls.clearBed(bed.id)),
    // From Integration
    updateBedSteps: integration.updateBedSteps,
    overrideBedFromLog: integration.overrideBedFromLog,
    moveBedState: integration.moveBedState,
    // Utils
    jumpToStep: (bedId: number, stepIndex: number) => {}, 
    realtimeStatus
  };
};
