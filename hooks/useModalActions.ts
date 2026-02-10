
import { useCallback } from 'react';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { TreatmentStep, QuickTreatment } from '../types';
import { generateTreatmentString } from '../utils/bedUtils';

export const useModalActions = (
  selectingLogId: string | null,
  selectingBedId: number | null,
  setSelectingLogId: (id: string | null) => void,
  setSelectingBedId: (id: number | null) => void,
  presets: any[] // Using any here to avoid cyclic dep if types aren't perfectly aligned, but ideally Preset[]
) => {
  const { 
    selectPreset,
    startCustomPreset,
    startQuickTreatment,
    startTraction,
    updateVisitWithBedSync
  } = useTreatmentContext();

  const mapOptionsToFlags = (options: any) => ({
    is_injection: options?.isInjection,
    is_fluid: options?.isFluid,
    is_traction: options?.isTraction,
    is_eswt: options?.isESWT,
    is_manual: options?.isManual,
  });

  const closeModal = useCallback(() => {
    setSelectingLogId(null);
    setSelectingBedId(null);
    window.history.back();
  }, [setSelectingLogId, setSelectingBedId]);

  const handleSelectPreset = useCallback((bedId: number, presetId: string, options: any) => {
    if (selectingLogId) {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        const updates = {
            treatment_name: generateTreatmentString(preset.steps),
            ...mapOptionsToFlags(options)
        };
        // If selectingBedId is present, we are assigning to a bed -> skipBedSync = false
        // If not, we are just editing the log -> skipBedSync = true
        updateVisitWithBedSync(selectingLogId, updates, !selectingBedId);
      }
      closeModal();
    } else {
      selectPreset(bedId, presetId, options);
      closeModal();
    }
  }, [selectingLogId, selectingBedId, presets, updateVisitWithBedSync, selectPreset, closeModal]);

  const handleCustomStart = useCallback((bedId: number, name: string, steps: TreatmentStep[], options: any) => {
    if (selectingLogId) {
       const updates = {
         treatment_name: generateTreatmentString(steps),
         ...mapOptionsToFlags(options)
       };
       updateVisitWithBedSync(selectingLogId, updates, !selectingBedId);
       closeModal();
    } else {
       startCustomPreset(bedId, name, steps, options);
       closeModal();
    }
  }, [selectingLogId, selectingBedId, updateVisitWithBedSync, startCustomPreset, closeModal]);

  const handleQuickStart = useCallback((bedId: number, template: QuickTreatment, options: any) => {
    if (selectingLogId) {
      const updates = {
        treatment_name: template.label || template.name,
        ...mapOptionsToFlags(options)
      };
      updateVisitWithBedSync(selectingLogId, updates, !selectingBedId);
      closeModal();
    } else {
      startQuickTreatment(bedId, template, options);
      closeModal();
    }
  }, [selectingLogId, selectingBedId, updateVisitWithBedSync, startQuickTreatment, closeModal]);
  
  const handleStartTraction = useCallback((bedId: number, duration: number, options: any) => {
    if (selectingLogId) {
       const { is_traction: _ignored, ...otherFlags } = mapOptionsToFlags(options);
       const updates = {
         treatment_name: '견인',
         ...otherFlags,
         is_traction: true
       };
       updateVisitWithBedSync(selectingLogId, updates, !selectingBedId);
       closeModal();
    } else {
       startTraction(bedId, duration, options);
       closeModal();
    }
  }, [selectingLogId, selectingBedId, updateVisitWithBedSync, startTraction, closeModal]);
  
  const handleClearLog = useCallback(() => {
    if (selectingLogId) {
      updateVisitWithBedSync(selectingLogId, {
        treatment_name: '',
        is_injection: false,
        is_fluid: false,
        is_traction: false,
        is_eswt: false,
        is_manual: false,
      }, true);
      closeModal();
    }
  }, [selectingLogId, updateVisitWithBedSync, closeModal]);

  return {
    handleSelectPreset,
    handleCustomStart,
    handleQuickStart,
    handleStartTraction,
    handleClearLog
  };
};
