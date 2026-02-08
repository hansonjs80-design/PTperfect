
import React, { useCallback } from 'react';
import { BedState, BedStatus, Preset, PatientVisit } from '../types';
import { calculateRemainingTime } from '../utils/bedLogic';
import { createSwappedPreset } from '../utils/treatmentFactories';

export const useBedControls = (
  bedsRef: React.MutableRefObject<BedState[]>,
  updateBedState: (id: number, updates: Partial<BedState>) => void,
  presets: Preset[],
  onUpdateVisit?: (bedId: number, updates: Partial<PatientVisit>) => void
) => {

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
    if (bed) {
        const newVal = !bed[flag];
        updateBedState(bedId, { [flag]: newVal });
        
        if (onUpdateVisit) {
            const map: Record<string, keyof PatientVisit> = {
                'isInjection': 'is_injection',
                'isFluid': 'is_fluid',
                'isTraction': 'is_traction',
                'isESWT': 'is_eswt',
                'isManual': 'is_manual'
            };
            const logKey = map[flag as string];
            if (logKey) {
                onUpdateVisit(bedId, { [logKey]: newVal });
            }
        }
    }
  }, [updateBedState, onUpdateVisit]);

  const updateMemo = useCallback((bedId: number, idx: number, memo: string | null) => {
    const bed = bedsRef.current.find(b => b.id === bedId);
    if (!bed) return;
    const newMemos = { ...bed.memos };
    if (!memo) delete newMemos[idx]; else newMemos[idx] = memo;
    updateBedState(bedId, { memos: newMemos });
  }, [updateBedState]);

  const updateBedDuration = useCallback((bedId: number, dur: number) => {
    updateBedState(bedId, { 
        startTime: Date.now(), 
        remainingTime: dur, 
        originalDuration: dur, 
        isPaused: false 
    });
  }, [updateBedState]);

  return {
    nextStep,
    prevStep,
    swapSteps,
    togglePause,
    clearBed,
    toggleFlag,
    updateMemo,
    updateBedDuration
  };
};