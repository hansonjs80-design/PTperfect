
import React, { Suspense, useMemo } from 'react';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { usePatientLogContext } from '../contexts/PatientLogContext';
import { TreatmentStep, QuickTreatment } from '../types';
import { generateTreatmentString, findMatchingPreset } from '../utils/bedUtils';

// Lazy load heavy components
const SettingsPanel = React.lazy(() => import('./SettingsPanel').then(module => ({ default: module.SettingsPanel })));
const PresetSelectorModal = React.lazy(() => import('./PresetSelectorModal').then(module => ({ default: module.PresetSelectorModal })));
const BedEditOverlay = React.lazy(() => import('./BedEditOverlay').then(module => ({ default: module.BedEditOverlay })));
const BedMoveModal = React.lazy(() => import('./modals/BedMoveModal').then(module => ({ default: module.BedMoveModal })));

interface GlobalModalsProps {
  isMenuOpen: boolean;
  onCloseMenu: () => void;
  presets: any[]; 
}

export const GlobalModals: React.FC<GlobalModalsProps> = ({ isMenuOpen, onCloseMenu }) => {
  const { 
    beds, 
    presets, 
    updatePresets,
    selectingBedId,
    setSelectingBedId,
    selectingLogId,
    setSelectingLogId,
    editingBedId,
    setEditingBedId,
    movingPatientState,
    setMovingPatientState,
    movePatient,
    selectPreset,
    startCustomPreset,
    startQuickTreatment,
    startTraction,
    resetAll,
    toggleInjection,
    toggleFluid,
    toggleTraction,
    toggleESWT,
    toggleManual,
    updateBedSteps,
    updateBedDuration,
    updateVisitWithBedSync
  } = useTreatmentContext();

  const { visits } = usePatientLogContext();

  const mapOptionsToFlags = (options: any) => ({
    is_injection: options?.isInjection,
    is_fluid: options?.isFluid,
    is_traction: options?.isTraction,
    is_eswt: options?.isESWT,
    is_manual: options?.isManual,
  });

  // --- LOGIC SEPARATION ---
  // 1. Pure Log Edit: selectingLogId is SET, selectingBedId is NULL.
  // 2. Assignment from Log: selectingLogId is SET, selectingBedId is SET.
  // 3. Manual Bed Control: selectingLogId is NULL, selectingBedId is SET.

  const handleSelectPreset = (bedId: number, presetId: string, options: any) => {
    if (selectingLogId) {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        if (selectingBedId) {
            // [CASE 2: Assignment Mode]
            // Bed exists in Log, Treatment Empty -> User selected preset.
            // Action: Update Log with Treatment Name + Sync (False) to trigger Bed Activation & Conflict Check.
            updateVisitWithBedSync(selectingLogId, {
                treatment_name: generateTreatmentString(preset.steps),
                ...mapOptionsToFlags(options)
            }, false); // <--- DO NOT SKIP SYNC. This triggers activation prompt.
        } else {
            // [CASE 1: Log Edit Mode]
            // Bed assigned, Treatment exists -> User editing log only.
            updateVisitWithBedSync(selectingLogId, {
                treatment_name: generateTreatmentString(preset.steps),
                ...mapOptionsToFlags(options)
            }, true); // <--- FORCE SKIP SYNC. Log text only.
        }
      }
      setSelectingLogId(null);
      setSelectingBedId(null);
    } else {
      // [CASE 3: Manual Control]
      selectPreset(bedId, presetId, options);
      setSelectingBedId(null);
    }
  };

  const handleCustomStart = (bedId: number, name: string, steps: TreatmentStep[], options: any) => {
    if (selectingLogId) {
       if (selectingBedId) {
           // [CASE 2: Assignment Mode]
           updateVisitWithBedSync(selectingLogId, {
             treatment_name: generateTreatmentString(steps),
             ...mapOptionsToFlags(options)
           }, false);
       } else {
           // [CASE 1: Log Edit Mode]
           updateVisitWithBedSync(selectingLogId, {
             treatment_name: generateTreatmentString(steps),
             ...mapOptionsToFlags(options)
           }, true);
       }
       setSelectingLogId(null);
       setSelectingBedId(null);
    } else {
       // [CASE 3: Manual Control]
       startCustomPreset(bedId, name, steps, options);
       setSelectingBedId(null);
    }
  };

  const handleQuickStart = (bedId: number, template: QuickTreatment, options: any) => {
    if (selectingLogId) {
      if (selectingBedId) {
          // [CASE 2: Assignment Mode]
          updateVisitWithBedSync(selectingLogId, {
            treatment_name: template.label || template.name,
            ...mapOptionsToFlags(options)
          }, false);
      } else {
          // [CASE 1: Log Edit Mode]
          updateVisitWithBedSync(selectingLogId, {
            treatment_name: template.label || template.name,
            ...mapOptionsToFlags(options)
          }, true);
      }
      setSelectingLogId(null);
      setSelectingBedId(null);
    } else {
      // [CASE 3: Manual Control]
      startQuickTreatment(bedId, template, options);
      setSelectingBedId(null);
    }
  };
  
  const handleStartTraction = (bedId: number, duration: number, options: any) => {
    if (selectingLogId) {
       const { is_traction: _ignored, ...otherFlags } = mapOptionsToFlags(options);
       const updatePayload = {
         treatment_name: '견인',
         ...otherFlags,
         is_traction: true
       };

       if (selectingBedId) {
           // [CASE 2: Assignment Mode]
           updateVisitWithBedSync(selectingLogId, updatePayload, false);
       } else {
           // [CASE 1: Log Edit Mode]
           updateVisitWithBedSync(selectingLogId, updatePayload, true);
       }
       setSelectingLogId(null);
       setSelectingBedId(null);
    } else {
       // [CASE 3: Manual Control]
       startTraction(bedId, duration, options);
       setSelectingBedId(null);
    }
  };
  
  const handleClearLog = () => {
    if (selectingLogId) {
      updateVisitWithBedSync(selectingLogId, {
        treatment_name: '',
        is_injection: false,
        is_fluid: false,
        is_traction: false,
        is_eswt: false,
        is_manual: false,
      }, true);
      setSelectingLogId(null);
      setSelectingBedId(null); // Ensure cleaned up
    }
  };

  const activeLogEntry = useMemo(() => {
    if (!selectingLogId) return null;
    return visits.find(v => v.id === selectingLogId) || null;
  }, [selectingLogId, visits]);

  const modalInitialOptions = useMemo(() => {
    if (activeLogEntry) {
      return {
        isInjection: !!activeLogEntry.is_injection,
        isFluid: !!activeLogEntry.is_fluid,
        isTraction: !!activeLogEntry.is_traction,
        isESWT: !!activeLogEntry.is_eswt,
        isManual: !!activeLogEntry.is_manual,
      };
    }
    return undefined;
  }, [activeLogEntry]);

  const modalInitialPreset = useMemo(() => {
    if (activeLogEntry) {
      return findMatchingPreset(presets, activeLogEntry.treatment_name);
    }
    return undefined;
  }, [activeLogEntry, presets]);


  const getBed = (id: number) => beds.find(b => b.id === id) || beds[0];
  const editingBed = editingBedId ? getBed(editingBedId) : null;
  const editingBedSteps = editingBed ? (editingBed.customPreset?.steps || presets.find(p => p.id === editingBed.currentPresetId)?.steps || []) : [];

  const isModalOpen = selectingBedId !== null || selectingLogId !== null;
  
  // Logic for Modal ID:
  // If selectingBedId is present, use it (Assignment or Manual).
  // If selectingBedId is NULL but LogID is set, pass 0 (Edit Mode).
  const targetBedIdForModal = selectingBedId !== null ? selectingBedId : (selectingLogId ? 0 : null);

  return (
    <Suspense fallback={null}>
      <PresetSelectorModal 
        isOpen={isModalOpen}
        onClose={() => {
          setSelectingBedId(null);
          setSelectingLogId(null);
        }}
        presets={presets}
        onSelect={handleSelectPreset}
        onCustomStart={handleCustomStart}
        onQuickStart={handleQuickStart}
        onStartTraction={handleStartTraction}
        onClearLog={handleClearLog}
        targetBedId={targetBedIdForModal}
        initialOptions={modalInitialOptions}
        initialPreset={modalInitialPreset}
      />

      {editingBed && (
        <BedEditOverlay 
          bed={editingBed}
          steps={editingBedSteps}
          onClose={() => setEditingBedId(null)}
          onToggleInjection={toggleInjection}
          onToggleFluid={toggleFluid}
          onToggleTraction={toggleTraction}
          onToggleESWT={toggleESWT}
          onToggleManual={toggleManual}
          onUpdateSteps={updateBedSteps}
          onUpdateDuration={updateBedDuration}
        />
      )}

      {movingPatientState !== null && (
        <BedMoveModal 
          fromBedId={movingPatientState.bedId}
          initialPos={{ x: movingPatientState.x, y: movingPatientState.y }}
          onClose={() => setMovingPatientState(null)}
          onConfirm={(toBedId) => movePatient(movingPatientState.bedId, toBedId)}
        />
      )}

      <SettingsPanel 
        isOpen={isMenuOpen} 
        onClose={onCloseMenu}
        presets={presets}
        onUpdatePresets={updatePresets}
        onResetAllBeds={resetAll}
      />

      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onCloseMenu} />
      )}
    </Suspense>
  );
};
