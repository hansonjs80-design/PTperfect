
import { useCallback } from 'react';
import { BedState, BedStatus, Preset, TreatmentStep, QuickTreatment, PatientVisit, SelectPresetOptions } from '../types';
import { STANDARD_TREATMENTS } from '../constants';
import { generateTreatmentString } from '../utils/bedUtils';
import { 
  createCustomPreset, 
  createQuickStep, 
  createTractionPreset 
} from '../utils/treatmentFactories';

export const useBedActions = (
  updateBedState: (id: number, updates: Partial<BedState>) => void,
  presets: Preset[],
  onAddVisit?: (data?: Partial<PatientVisit>) => Promise<string>
) => {

  const selectPreset = useCallback((bedId: number, presetId: string, options?: SelectPresetOptions) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    const firstStep = preset.steps[0];
    
    if (onAddVisit) {
        onAddVisit({
            bed_id: bedId,
            treatment_name: generateTreatmentString(preset.steps),
            is_injection: options?.isInjection || false,
            is_fluid: options?.isFluid || false,
            is_traction: options?.isTraction || false,
            is_eswt: options?.isESWT || false,
            is_manual: options?.isManual || false,
        });
    }

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
  }, [presets, updateBedState, onAddVisit]);

  const startCustomPreset = useCallback((bedId: number, name: string, steps: TreatmentStep[], options?: SelectPresetOptions) => {
    if (steps.length === 0) return;
    
    const customPreset = createCustomPreset(name, steps);
    const firstStep = steps[0];

    if (onAddVisit) {
        onAddVisit({
            bed_id: bedId,
            treatment_name: generateTreatmentString(steps),
            is_injection: options?.isInjection || false,
            is_fluid: options?.isFluid || false,
            is_traction: options?.isTraction || false,
            is_eswt: options?.isESWT || false,
            is_manual: options?.isManual || false,
        });
    }

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
  }, [updateBedState, onAddVisit]);

  const startQuickTreatment = useCallback((bedId: number, template: typeof STANDARD_TREATMENTS[0], options?: SelectPresetOptions) => {
    const step = createQuickStep(template.name, template.duration, template.enableTimer, template.color);
    startCustomPreset(bedId, template.name, [step], options);
  }, [startCustomPreset]);

  const startTraction = useCallback((bedId: number, durationMinutes: number, options: any) => {
    const tractionPreset = createTractionPreset(durationMinutes);
    const firstStep = tractionPreset.steps[0];

    if (onAddVisit) {
        onAddVisit({
            bed_id: bedId,
            treatment_name: '견인', 
            is_traction: true, 
            is_injection: options?.isInjection || false,
            is_fluid: options?.isFluid || false,
            is_eswt: options?.isESWT || false,
            is_manual: options?.isManual || false,
        });
    }

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
  }, [updateBedState, onAddVisit]);

  return {
    selectPreset,
    startCustomPreset,
    startQuickTreatment,
    startTraction
  };
};
