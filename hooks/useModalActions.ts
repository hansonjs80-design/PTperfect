
import { useCallback } from 'react';
import { usePatientLogContext } from '../contexts/PatientLogContext';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { TreatmentStep, QuickTreatment } from '../types';
import { generateTreatmentString } from '../utils/bedUtils';

export const useModalActions = (
  selectingLogId: string | null,
  selectingBedId: number | null,
  setSelectingLogId: (id: string | null) => void,
  setSelectingBedId: (id: number | null) => void,
  presets: any[], // Using any here to avoid cyclic dep if types aren't perfectly aligned, but ideally Preset[]
  selectingAppendMode: boolean,
  setSelectingAppendMode: (v: boolean) => void
) => {
  const { visits } = usePatientLogContext();

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
    is_ion: options?.isIon,
    is_exercise: options?.isExercise,
  });

  const withRuntimeBedId = useCallback((updates: Record<string, any>) => {
    if (selectingBedId) {
      return { ...updates, bed_id: selectingBedId };
    }
    return updates;
  }, [selectingBedId]);

  const restoreSelectedGridFocus = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const targetGridId = document.body.dataset.patientLogModalReturnGridId;
        const targetHost = targetGridId
          ? document.querySelector(`[data-grid-id="${targetGridId}"]`) as HTMLElement | null
          : null;
        const selectedHost = document.querySelector('[data-grid-id][data-grid-selection="true"]') as HTMLElement | null;
        (targetHost || selectedHost)?.focus();
        delete document.body.dataset.patientLogModalReturnGridId;
      });
    });
  }, []);

  const closeModal = useCallback(() => {
    // 1. Reset UI State immediately
    setSelectingLogId(null);
    setSelectingBedId(null);
    setSelectingAppendMode(false);
    
    // 2. Conditional History Back
    // Only call back() if the current history state indicates a modal is open.
    // This prevents double-back actions or backing when the state has already been popped (e.g. hardware back button).
    if (window.history.state?.modalOpen) {
        window.history.back();
    }
    restoreSelectedGridFocus();
  }, [restoreSelectedGridFocus, setSelectingLogId, setSelectingBedId, setSelectingAppendMode]);

  const handleSelectPreset = useCallback((bedId: number, presetId: string, options: any) => {
    if (selectingLogId) {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        const updates = withRuntimeBedId({
            treatment_name: generateTreatmentString(preset.steps),
            ...mapOptionsToFlags(options)
        });
        // If selectingBedId is present, we are assigning to a bed -> skipBedSync = false
        // If not, we are just editing the log -> skipBedSync = true
        updateVisitWithBedSync(selectingLogId, updates, !selectingBedId);
      }
      closeModal();
    } else {
      selectPreset(bedId, presetId, options);
      closeModal();
    }
  }, [selectingLogId, selectingBedId, presets, updateVisitWithBedSync, selectPreset, closeModal, withRuntimeBedId]);

  const handleCustomStart = useCallback((bedId: number, name: string, steps: TreatmentStep[], options: any) => {
    if (selectingLogId) {
       const updates = withRuntimeBedId({
         treatment_name: generateTreatmentString(steps),
         ...mapOptionsToFlags(options)
       });
       updateVisitWithBedSync(selectingLogId, updates, !selectingBedId);
       closeModal();
    } else {
       startCustomPreset(bedId, name, steps, options);
       closeModal();
    }
  }, [selectingLogId, selectingBedId, updateVisitWithBedSync, startCustomPreset, closeModal, withRuntimeBedId]);

  const buildAppendedTreatmentName = useCallback((base: string, next: string) => {
    const current = base.trim();
    const incoming = next.trim();
    if (!incoming) return current;
    if (!current) return incoming;
    const parts = current.split('/').map((p) => p.trim()).filter(Boolean);
    if (parts.some((p) => p.toLowerCase() === incoming.toLowerCase())) return current;
    return `${current} / ${incoming}`;
  }, []);

  const handleQuickStart = useCallback((bedId: number, template: QuickTreatment, options: any) => {
    if (selectingLogId) {
      const selectedVisit = visits.find((visit) => visit.id === selectingLogId);
      const nextTreatmentName = template.label || template.name;
      const treatmentName = selectingAppendMode
        ? buildAppendedTreatmentName(selectedVisit?.treatment_name || '', nextTreatmentName)
        : nextTreatmentName;

      const updates = withRuntimeBedId({
        treatment_name: treatmentName,
        ...mapOptionsToFlags(options)
      });
      updateVisitWithBedSync(selectingLogId, updates, !selectingBedId);
      closeModal();
    } else {
      startQuickTreatment(bedId, template, options);
      closeModal();
    }
  }, [selectingLogId, selectingBedId, selectingAppendMode, visits, buildAppendedTreatmentName, updateVisitWithBedSync, startQuickTreatment, closeModal, withRuntimeBedId]);
  
  const handleStartTraction = useCallback((bedId: number, duration: number, options: any) => {
    if (selectingLogId) {
       const { is_traction: _ignored, ...otherFlags } = mapOptionsToFlags(options);
       const updates = withRuntimeBedId({
         treatment_name: '견인',
         ...otherFlags,
         is_traction: true
       });
       updateVisitWithBedSync(selectingLogId, updates, !selectingBedId);
       closeModal();
    } else {
       startTraction(bedId, duration, options);
       closeModal();
    }
  }, [selectingLogId, selectingBedId, updateVisitWithBedSync, startTraction, closeModal, withRuntimeBedId]);
  
  const handleClearLog = useCallback(() => {
    if (selectingLogId) {
      updateVisitWithBedSync(selectingLogId, {
        treatment_name: '',
        is_injection: false,
        is_fluid: false,
        is_traction: false,
        is_eswt: false,
        is_manual: false,
        is_ion: false,
        is_exercise: false,
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
