
import React, { useCallback } from 'react';
import { BedState, BedStatus, Preset, TreatmentStep, QuickTreatment, PatientVisit } from '../types';
import { findMatchingPreset, parseTreatmentString, generateTreatmentString } from '../utils/bedUtils';

export const useBedIntegration = (
  bedsRef: React.MutableRefObject<BedState[]>,
  updateBedState: (id: number, updates: Partial<BedState>) => void,
  presets: Preset[],
  quickTreatments: QuickTreatment[],
  clearBed: (id: number) => void,
  onUpdateVisit?: (bedId: number, updates: Partial<PatientVisit>) => void
) => {

  const overrideBedFromLog = useCallback((bedId: number, visit: PatientVisit, forceRestart: boolean) => {
    const treatmentName = visit.treatment_name || "";
    const matchingPreset = findMatchingPreset(presets, treatmentName);
    
    let steps: TreatmentStep[] = [];
    let currentPresetId: string | null = null;
    let customPreset: any = null;

    if (matchingPreset) {
      steps = matchingPreset.steps;
      if (!matchingPreset.id.startsWith('restored-')) {
          currentPresetId = matchingPreset.id;
      } else {
          customPreset = matchingPreset;
      }
    } else {
        steps = parseTreatmentString(treatmentName, quickTreatments);
        if (steps.length > 0) {
            customPreset = { id: `log-restore-${Date.now()}`, name: treatmentName, steps };
        }
    }

    if (steps.length === 0) return;

    const bed = bedsRef.current.find(b => b.id === bedId);
    if (!bed) return;

    const currentSteps = bed.customPreset?.steps || presets.find(p => p.id === bed.currentPresetId)?.steps || [];
    const isStepsChanged = JSON.stringify(steps) !== JSON.stringify(currentSteps);

    const updates: Partial<BedState> = {
        isInjection: visit.is_injection || false,
        isFluid: visit.is_fluid || false,
        isTraction: visit.is_traction || false,
        isESWT: visit.is_eswt || false,
        isManual: visit.is_manual || false,
    };

    if (forceRestart || bed.status !== BedStatus.ACTIVE || isStepsChanged) {
        const firstStep = steps[0];
        updates.status = BedStatus.ACTIVE;
        updates.currentPresetId = currentPresetId;
        updates.customPreset = customPreset;
        updates.currentStepIndex = 0;
        updates.queue = [];
        updates.startTime = Date.now();
        updates.remainingTime = firstStep ? firstStep.duration : 0;
        updates.originalDuration = firstStep ? firstStep.duration : 0;
        updates.isPaused = false;
        updates.memos = {};
    }

    updateBedState(bedId, updates);
  }, [presets, quickTreatments, updateBedState]);

  const moveBedState = useCallback(async (fromBedId: number, toBedId: number) => {
    const fromBed = bedsRef.current.find(b => b.id === fromBedId);
    if (!fromBed) return;

    const stateToMove: Partial<BedState> = {
        status: fromBed.status,
        currentPresetId: fromBed.currentPresetId,
        customPreset: fromBed.customPreset,
        currentStepIndex: fromBed.currentStepIndex,
        queue: fromBed.queue,
        startTime: fromBed.startTime,
        remainingTime: fromBed.remainingTime,
        originalDuration: fromBed.originalDuration,
        isPaused: fromBed.isPaused,
        isInjection: fromBed.isInjection,
        isFluid: fromBed.isFluid,
        isTraction: fromBed.isTraction,
        isESWT: fromBed.isESWT,
        isManual: fromBed.isManual,
        memos: fromBed.memos
    };

    await updateBedState(toBedId, stateToMove);
    clearBed(fromBedId);
  }, [updateBedState, clearBed]);

  const updateBedSteps = useCallback((bedId: number, newSteps: TreatmentStep[]) => {
      const bed = bedsRef.current.find(b => b.id === bedId);
      if (!bed) return;

      const oldSteps = bed.customPreset?.steps || presets.find(p => p.id === bed.currentPresetId)?.steps || [];
      const currentIdx = bed.currentStepIndex;
      
      const oldCurrentStep = oldSteps[currentIdx];
      const newCurrentStep = newSteps[currentIdx];

      const isCurrentStepChanged = !newCurrentStep ||
                                   !oldCurrentStep || 
                                   newCurrentStep.id !== oldCurrentStep.id ||
                                   newCurrentStep.duration !== oldCurrentStep.duration;

      const updates: Partial<BedState> = {
          customPreset: { id: `custom-edit-${Date.now()}`, name: '치료(수정됨)', steps: newSteps }
      };

      if (isCurrentStepChanged) {
          if (newCurrentStep) {
              updates.remainingTime = newCurrentStep.duration;
              updates.originalDuration = newCurrentStep.duration;
              updates.startTime = Date.now();
              updates.isPaused = false;
          } else {
              updates.status = BedStatus.COMPLETED;
              updates.remainingTime = 0;
          }
      } 

      updateBedState(bedId, updates);
      
      if (onUpdateVisit) {
          onUpdateVisit(bedId, { treatment_name: generateTreatmentString(newSteps) });
      }
  }, [presets, updateBedState, onUpdateVisit]);

  return {
    overrideBedFromLog,
    moveBedState,
    updateBedSteps
  };
};