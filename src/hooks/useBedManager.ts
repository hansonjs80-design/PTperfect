import { useEffect, useCallback, useState, useRef } from 'react';
import { BedState, BedStatus, Preset, TreatmentStep } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { TOTAL_BEDS, STANDARD_TREATMENTS } from '../constants';
import { supabase, isOnlineMode } from '../lib/supabase';
import { useBedTimer } from './useBedTimer';
import { useBedRealtime } from './useBedRealtime';
import { useWakeLock } from './useWakeLock';
import { mapBedToDbPayload, calculateRemainingTime } from '../utils/bedLogic';
import { 
  createCustomPreset, 
  createQuickStep, 
  createSwappedPreset, 
  createTractionPreset 
} from '../utils/treatmentFactories';

interface SelectPresetOptions {
  isInjection?: boolean;
  isFluid?: boolean;
  isTraction?: boolean;
  isESWT?: boolean;
  isManual?: boolean;
}

export const useBedManager = (presets: Preset[], isSoundEnabled: boolean) => {
  const [localBeds, setLocalBeds] = useLocalStorage<BedState[]>('physio-beds-v8', 
    Array.from({ length: TOTAL_BEDS }, (_, i) => ({
      id: i + 1,
      status: BedStatus.IDLE,
      currentPresetId: null,
      currentStepIndex: 0,
      queue: [],
      remainingTime: 0,
      startTime: null,
      isPaused: false,
      isInjection: false,
      isFluid: false,
      isTraction: false,
      isESWT: false,
      isManual: false,
      memos: {}
    }))
  );

  const [beds, setBeds] = useState<BedState[]>(localBeds);
  const bedsRef = useRef(beds);
  
  useEffect(() => {
    bedsRef.current = beds;
  }, [beds]);

  // Pass 'beds' to useBedTimer so it can sync with the Web Worker
  useBedTimer(setBeds, presets, isSoundEnabled, beds);
  
  const { realtimeStatus } = useBedRealtime(setBeds, setLocalBeds);

  // Activate Wake Lock if any bed is ACTIVE to prevent screen sleep
  const hasActiveBeds = beds.some(b => b.status === BedStatus.ACTIVE && !b.isPaused);
  useWakeLock(hasActiveBeds);

  useEffect(() => {
    if (!isOnlineMode()) setBeds(localBeds);
  }, [localBeds]);

  const updateBedState = useCallback(async (bedId: number, updates: Partial<BedState>) => {
    const timestamp = Date.now();
    const updateWithTimestamp = { ...updates, lastUpdateTimestamp: timestamp };
    
    setBeds(prev => prev.map(b => b.id === bedId ? { ...b, ...updateWithTimestamp } : b));
    setLocalBeds(prev => prev.map(b => b.id === bedId ? { ...b, ...updateWithTimestamp } : b));

    if (isOnlineMode() && supabase) {
      const dbPayload = mapBedToDbPayload(updates);
      const { error } = await supabase.from('beds').update(dbPayload).eq('id', bedId);
      if (error) console.error(`[BedManager] DB Update Failed:`, error.message);
    }
  }, [setLocalBeds]);

  const selectPreset = useCallback((bedId: number, presetId: string, options?: SelectPresetOptions) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    const firstStep = preset.steps[0];
    
    updateBedState(bedId, {
      status: BedStatus.ACTIVE,
      currentPresetId: presetId,
      customPreset: null as any,
      currentStepIndex: 0,
      queue: [],
      startTime: Date.now(),
      remainingTime: firstStep.duration,
      originalDuration: firstStep.duration,
      isPaused: false,
      isInjection: options?.isInjection || false,
      isFluid: options?.isFluid || false,
      isTraction: options?.isTraction || false,
      isESWT: options?.isESWT || false,
      isManual: options?.isManual || false,
      memos: {}
    });
  }, [presets, updateBedState]);

  const startCustomPreset = useCallback((bedId: number, name: string, steps: TreatmentStep[], options?: SelectPresetOptions) => {
    if (steps.length === 0) return;
    
    const customPreset = createCustomPreset(name, steps);
    const firstStep = steps[0];

    updateBedState(bedId, {
      status: BedStatus.ACTIVE,
      currentPresetId: customPreset.id,
      customPreset: customPreset,
      currentStepIndex: 0,
      queue: [],
      startTime: Date.now(),
      remainingTime: firstStep.duration,
      originalDuration: firstStep.duration,
      isPaused: false,
      isInjection: options?.isInjection || false,
      isFluid: options?.isFluid || false,
      isTraction: options?.isTraction || false,
      isESWT: options?.isESWT || false,
      isManual: options?.isManual || false,
      memos: {}
    });
  }, [updateBedState]);

  const startQuickTreatment = useCallback((bedId: number, template: typeof STANDARD_TREATMENTS[0], options?: SelectPresetOptions) => {
    const step = createQuickStep(template.name, template.duration, template.enableTimer, template.color);
    startCustomPreset(bedId, template.name, [step], options);
  }, [startCustomPreset]);

  const startTraction = useCallback((bedId: number, durationMinutes: number, options: any) => {
    const tractionPreset = createTractionPreset(durationMinutes);
    const firstStep = tractionPreset.steps[0];

    updateBedState(bedId, {
        status: BedStatus.ACTIVE,
        currentPresetId: tractionPreset.id,
        customPreset: tractionPreset,
        currentStepIndex: 0,
        queue: [],
        startTime: Date.now(),
        remainingTime: firstStep.duration,
        originalDuration: firstStep.duration,
        isPaused: false,
        ...options,
        memos: {}
    });
  }, [updateBedState]);

  const nextStep = useCallback((bedId: number) => {
    const bed = bedsRef.current.find(b => b.id === bedId);
    if (!bed || bed.status === BedStatus.IDLE) return;
    
    const preset = bed.customPreset || presets.find(p => p.id === bed.currentPresetId);
    if (!preset) return;
    
    const nextIndex = bed.currentStepIndex + 1;
    
    if (nextIndex < preset.steps.length) {
      const nextStepItem = preset.steps[nextIndex];
      updateBedState(bedId, {
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
    if (!bed || bed.status !== BedStatus.ACTIVE) return;
    
    const preset = bed.customPreset || presets.find(p => p.id === bed.currentPresetId);
    if (!preset) return;

    const prevIndex = bed.currentStepIndex - 1;
    
    if (prevIndex >= 0) {
      const prevStepItem = preset.steps[prevIndex];
      updateBedState(bedId, {
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

    // Use factory to generate swapped preset structure
    const swapResult = createSwappedPreset(
      bed.customPreset, 
      bed.currentPresetId, 
      presets, 
      idx1, 
      idx2
    );

    if (!swapResult) return;

    const updates: Partial<BedState> = {
       customPreset: swapResult.preset,
       memos: {
         ...bed.memos,
         [idx1]: bed.memos[idx2],
         [idx2]: bed.memos[idx1]
       }
    };
    
    // If we swapped the *currently running* step, restart its timer logic
    if (bed.status === BedStatus.ACTIVE && (bed.currentStepIndex === idx1 || bed.currentStepIndex === idx2)) {
       const currentStepItem = swapResult.steps[bed.currentStepIndex];
       updates.remainingTime = currentStepItem.duration;
       updates.originalDuration = currentStepItem.duration;
       updates.startTime = Date.now();
       updates.isPaused = false;
    }

    updateBedState(bedId, updates);
  }, [presets, updateBedState]);

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
    updateBedState(bedId, {
      status: BedStatus.IDLE,
      currentPresetId: null,
      customPreset: null as any,
      currentStepIndex: 0,
      queue: [],
      startTime: null,
      originalDuration: undefined,
      remainingTime: 0,
      isPaused: false,
      isInjection: false,
      isFluid: false,
      isTraction: false,
      isESWT: false,
      isManual: false,
      memos: {}
    });
  }, [updateBedState]);

  const toggleFlag = useCallback((bedId: number, flag: keyof BedState) => {
    const bed = bedsRef.current.find(b => b.id === bedId);
    if (bed) updateBedState(bedId, { [flag]: !bed[flag] });
  }, [updateBedState]);

  return { 
    beds, 
    selectPreset, 
    startCustomPreset, 
    startQuickTreatment,
    startTraction,
    nextStep,
    prevStep,
    swapSteps, 
    togglePause,
    jumpToStep: (bedId: number, stepIndex: number) => {},
    toggleInjection: (id: number) => toggleFlag(id, 'isInjection'),
    toggleFluid: (id: number) => toggleFlag(id, 'isFluid'),
    toggleTraction: (id: number) => toggleFlag(id, 'isTraction'),
    toggleESWT: (id: number) => toggleFlag(id, 'isESWT'),
    toggleManual: (id: number) => toggleFlag(id, 'isManual'),
    updateMemo: (bedId: number, idx: number, memo: string | null) => {
      const bed = bedsRef.current.find(b => b.id === bedId);
      if (!bed) return;
      const newMemos = { ...bed.memos };
      if (!memo) delete newMemos[idx]; else newMemos[idx] = memo;
      updateBedState(bedId, { memos: newMemos });
    },
    updateBedDuration: (bedId: number, dur: number) => updateBedState(bedId, { startTime: Date.now(), remainingTime: dur, originalDuration: dur, isPaused: false }),
    updateBedSteps: (bedId: number, steps: TreatmentStep[]) => {
      const bed = bedsRef.current.find(b => b.id === bedId);
      if (!bed) return;
      updateBedState(bedId, { customPreset: { id: 'custom', name: '치료', steps } });
    },
    clearBed, 
    resetAll: () => bedsRef.current.forEach(bed => clearBed(bed.id)),
    realtimeStatus 
  };
};