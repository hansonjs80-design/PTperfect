
import React, { useCallback } from 'react';
import { BedState, BedStatus, Preset, PatientVisit } from '../types';
import { calculateRemainingTime } from '../utils/bedLogic';
import { createSwappedPreset } from '../utils/treatmentFactories';
import { generateTreatmentString } from '../utils/bedUtils';


const createStablePresetSnapshot = (preset: Preset) => ({
  ...preset,
  steps: preset.steps.map((step) => ({ ...step }))
});

export const useBedControls = (
  bedsRef: React.MutableRefObject<BedState[]>,
  updateBedState: (id: number, updates: Partial<BedState>, skipDbWrite?: boolean) => void,
  presets: Preset[],
  onUpdateVisit?: (bedId: number, updates: Partial<PatientVisit>) => void
) => {

  const nextStep = useCallback((bedId: number) => {
    const bed = bedsRef.current.find(b => b.id === bedId);
    if (!bed || bed.status === BedStatus.IDLE) return;

    const runtimePreset = bed.customPreset || (bed.currentPresetId ? presets.find(p => p.id === bed.currentPresetId) : null);
    if (!runtimePreset) return;

    const stablePreset = bed.customPreset || createStablePresetSnapshot(runtimePreset);
    const totalSteps = stablePreset.steps.length;
    if (totalSteps === 0) return;

    // stale sync 등으로 currentStepIndex가 비정상 범위가 되면 즉시 완료로 보내지 말고 0단계로 복구
    if (bed.currentStepIndex < 0 || bed.currentStepIndex >= totalSteps) {
      const firstStep = stablePreset.steps[0];
      updateBedState(bedId, {
        status: BedStatus.ACTIVE,
        customPreset: stablePreset,
        currentStepIndex: 0,
        queue: [],
        startTime: Date.now(),
        remainingTime: firstStep.duration,
        originalDuration: firstStep.duration,
        isPaused: false
      });
      return;
    }

    const nextIndex = bed.currentStepIndex + 1;

    if (nextIndex < totalSteps) {
      const nextStepItem = stablePreset.steps[nextIndex];
      updateBedState(bedId, {
        status: BedStatus.ACTIVE,
        customPreset: stablePreset,
        currentStepIndex: nextIndex,
        queue: [],
        startTime: Date.now(),
        remainingTime: nextStepItem.duration,
        originalDuration: nextStepItem.duration,
        isPaused: false
      });
    } else {
      updateBedState(bedId, { status: BedStatus.COMPLETED, remainingTime: 0, isPaused: false });
    }
  }, [presets, updateBedState]);

  const prevStep = useCallback((bedId: number) => {
    const bed = bedsRef.current.find(b => b.id === bedId);
    // ACTIVE 또는 COMPLETED 상태일 때만 이전 단계로 이동 가능
    if (!bed || (bed.status !== BedStatus.ACTIVE && bed.status !== BedStatus.COMPLETED)) return;

    const runtimePreset = bed.customPreset || (bed.currentPresetId ? presets.find(p => p.id === bed.currentPresetId) : null);
    if (!runtimePreset) return;

    const stablePreset = bed.customPreset || createStablePresetSnapshot(runtimePreset);

    // 만약 완료 상태라면 마지막 인덱스로 돌아가고, 아니면 현재 인덱스에서 -1
    let prevIndex = bed.status === BedStatus.COMPLETED
      ? stablePreset.steps.length - 1
      : bed.currentStepIndex - 1;

    if (prevIndex >= 0) {
      const prevStepItem = stablePreset.steps[prevIndex];
      updateBedState(bedId, {
        status: BedStatus.ACTIVE, // 상태를 다시 ACTIVE로 복구
        customPreset: stablePreset,
        currentStepIndex: prevIndex,
        startTime: Date.now(),
        remainingTime: prevStepItem.duration,
        originalDuration: prevStepItem.duration,
        isPaused: false
      });
    }
  }, [presets, updateBedState]);

  const swapSteps = useCallback((bedId: number, idx1: number, idx2: number) => {
    const bed = bedsRef.current.find(b => b.id === bedId);
    if (!bed) return;

    const swapResult = createSwappedPreset(
      bed.customPreset,
      bed.currentPresetId,
      presets,
      idx1,
      idx2
    );

    if (!swapResult) return;

    const updates: Partial<BedState> = {
      customPreset: swapResult.preset
    };

    // 순서 변경/자리 교환은 타이머 상태를 건드리지 않고 목록 위치만 변경한다.
    updateBedState(bedId, updates);

    if (onUpdateVisit) {
      onUpdateVisit(bedId, { treatment_name: generateTreatmentString(swapResult.steps) });
    }
  }, [presets, updateBedState, onUpdateVisit]);

  const togglePause = useCallback((bedId: number) => {
    const bed = bedsRef.current.find(b => b.id === bedId);
    if (!bed || bed.status !== BedStatus.ACTIVE) return;

    if (!bed.isPaused) {
      const currentRemaining = calculateRemainingTime(bed, presets);
      updateBedState(bedId, {
        isPaused: true,
        remainingTime: currentRemaining
      });
    } else {
      updateBedState(bedId, {
        isPaused: false,
        startTime: Date.now(),
        originalDuration: bed.remainingTime
      });
    }
  }, [presets, updateBedState]);

  const clearBed = useCallback((bedId: number) => {
    // skipDbWrite=true: 로컬만 즉시 초기화, DB는 clearBedInDb가 전체 필드를 한 번에 upsert
    // → race condition(status만 IDLE로 변경된 뒤 폴링이 stale preset 데이터를 복원하는 문제) 방지
    updateBedState(bedId, {
      status: BedStatus.IDLE,
      currentPresetId: null,
      customPreset: null as any,
      currentStepIndex: 0,
      queue: [],
      startTime: null,
      originalDuration: null as any,
      remainingTime: 0,
      isPaused: false,
      isInjection: false,
      isFluid: false,
      isTraction: false,
      isESWT: false,
      isManual: false,
      isIon: false,
      isExercise: false,
      isInjectionCompleted: false,
      patientMemo: null as any,
    }, true); // skipDbWrite=true
  }, [updateBedState]);

  const toggleFlag = useCallback((bedId: number, flag: keyof BedState) => {
    const bed = bedsRef.current.find(b => b.id === bedId);
    if (bed) {
      const newVal = !bed[flag];
      updateBedState(bedId, { [flag]: newVal });

      if (onUpdateVisit) {
        const map: Record<string, keyof PatientVisit> = {
          'isInjection': 'is_injection',
          'isInjectionCompleted': 'is_injection_completed',
          'isFluid': 'is_fluid',
          'isTraction': 'is_traction',
          'isESWT': 'is_eswt',
          'isManual': 'is_manual',
          'isIon': 'is_ion',
          'isExercise': 'is_exercise'
        };
        const logKey = map[flag as string];
        if (logKey) {
          onUpdateVisit(bedId, { [logKey]: newVal });
        }
      }
    }
  }, [updateBedState, onUpdateVisit]);

  const updateBedDuration = useCallback((bedId: number, dur: number) => {
    updateBedState(bedId, {
      startTime: Date.now(),
      remainingTime: dur,
      originalDuration: dur,
      isPaused: false
    });
  }, [updateBedState]);

  const updatePatientMemo = useCallback((bedId: number, memo: string | undefined) => {
    updateBedState(bedId, { patientMemo: memo });
    if (onUpdateVisit) {
      onUpdateVisit(bedId, { memo: memo });
    }
  }, [updateBedState, onUpdateVisit]);

  return {
    nextStep,
    prevStep,
    swapSteps,
    togglePause,
    clearBed,
    toggleFlag,
    updateBedDuration,
    updatePatientMemo
  };
};
