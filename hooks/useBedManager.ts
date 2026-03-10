
import { Preset } from '../types';
import { useBedState } from './useBedState';
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
    startTimerOnly: actions.startTimerOnly,
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
    toggleIon: (id: number) => controls.toggleFlag(id, 'isIon'),
    toggleInjectionCompleted: (id: number) => controls.toggleFlag(id, 'isInjectionCompleted'),
    updatePatientMemo: controls.updatePatientMemo,
    updateBedDuration: controls.updateBedDuration,
    clearBed: (bedId: number) => {
      controls.clearBed(bedId);       // 로컬 UI 즉시 업데이트 (skipDbWrite=true)
      broadcastClearBed(bedId);       // 다른 디바이스에 즉시 알림
      clearBedInDb(bedId);            // DB 전체 필드 upsert (3회 재시도)
    },
    resetAll: async () => {
      // 1. 로컬 UI + 브로드캐스트 즉시 처리
      bedsRef.current.forEach(bed => {
        controls.clearBed(bed.id);
        broadcastClearBed(bed.id);
      });
      // 2. DB 쓰기 병렬 실행 & 완료 대기 (리로드 전 DB 반영 보장)
      await Promise.all(bedsRef.current.map(bed => clearBedInDb(bed.id)));
    },
    // From Integration
    updateBedSteps: integration.updateBedSteps,
    overrideBedFromLog: integration.overrideBedFromLog,
    moveBedState: integration.moveBedState,
    updateBedMemoFromLog: integration.updateBedMemoFromLog,
    updateBedFlagsFromLog: integration.updateBedFlagsFromLog,

    // Core & Utils
    updateBedState,
    restoreBeds, // EXPOSED
    refreshBeds, // EXPOSED
    jumpToStep: (bedId: number, stepIndex: number) => { },
    realtimeStatus
  };
};
