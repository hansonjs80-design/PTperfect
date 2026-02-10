
import React, { Suspense, useMemo, useEffect } from 'react';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { usePatientLogContext } from '../contexts/PatientLogContext';
import { findMatchingPreset } from '../utils/bedUtils';
import { BedEditOverlay } from './BedEditOverlay'; 
import { useModalActions } from '../hooks/useModalActions';

// Lazy load heavy components
const SettingsPanel = React.lazy(() => import('./SettingsPanel').then(module => ({ default: module.SettingsPanel })));
const PresetSelectorModal = React.lazy(() => import('./PresetSelectorModal').then(module => ({ default: module.PresetSelectorModal })));
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
    selectingBedId,
    setSelectingBedId,
    selectingLogId,
    setSelectingLogId,
    editingBedId,
    setEditingBedId,
    movingPatientState,
    setMovingPatientState,
    movePatient,
    resetAll,
    toggleInjection,
    toggleFluid,
    toggleTraction,
    toggleESWT,
    toggleManual,
    updateBedSteps,
    updateBedDuration,
    updatePresets
  } = useTreatmentContext();

  const { visits } = usePatientLogContext();

  // Use the extracted hook for business logic
  const { 
    handleSelectPreset,
    handleCustomStart,
    handleQuickStart,
    handleStartTraction,
    handleClearLog
  } = useModalActions(selectingLogId, selectingBedId, setSelectingLogId, setSelectingBedId, presets);

  // --- Back Button Handling (SPA UX) ---
  const isModalOpen = selectingBedId !== null || selectingLogId !== null || editingBedId !== null || movingPatientState !== null || isMenuOpen;

  useEffect(() => {
    if (isModalOpen) {
      // When a modal opens, push a state to history.
      // This state acts as a "shield" so back button closes modal, not app.
      window.history.pushState({ modalOpen: true }, '');
      
      const handlePopState = () => {
        // When back button is pressed, close all modals
        setSelectingBedId(null);
        setSelectingLogId(null);
        setEditingBedId(null);
        setMovingPatientState(null);
        if (isMenuOpen) onCloseMenu();
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isModalOpen, isMenuOpen, onCloseMenu, setSelectingBedId, setSelectingLogId, setEditingBedId, setMovingPatientState]);

  // Helper to close modal and pop history manually (for close buttons inside modals)
  const closeAndPop = (setter: (val: any) => void) => {
    setter(null);
    window.history.back();
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

  const isSelectorOpen = selectingBedId !== null || selectingLogId !== null;
  const targetBedIdForModal = selectingBedId !== null ? selectingBedId : (selectingLogId ? 0 : null);

  return (
    <>
      {/* Selector Modal */}
      {isSelectorOpen && (
        <Suspense fallback={null}>
          <PresetSelectorModal 
            isOpen={isSelectorOpen}
            onClose={() => {
              setSelectingBedId(null);
              setSelectingLogId(null);
              window.history.back();
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
        </Suspense>
      )}

      {/* Bed Edit Overlay */}
      {editingBed && (
        <BedEditOverlay 
          bed={editingBed}
          steps={editingBedSteps}
          onClose={() => closeAndPop(setEditingBedId)}
          onToggleInjection={toggleInjection}
          onToggleFluid={toggleFluid}
          onToggleTraction={toggleTraction}
          onToggleESWT={toggleESWT}
          onToggleManual={toggleManual}
          onUpdateSteps={updateBedSteps}
          onUpdateDuration={updateBedDuration}
        />
      )}

      {/* Move Modal */}
      {movingPatientState !== null && (
        <Suspense fallback={null}>
          <BedMoveModal 
            fromBedId={movingPatientState.bedId}
            initialPos={{ x: movingPatientState.x, y: movingPatientState.y }}
            onClose={() => closeAndPop(setMovingPatientState)}
            onConfirm={(toBedId) => {
               movePatient(movingPatientState.bedId, toBedId);
               window.history.back(); // Close modal manually after action
            }}
          />
        </Suspense>
      )}

      {/* Settings */}
      {isMenuOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />}>
          <SettingsPanel 
            isOpen={isMenuOpen} 
            onClose={() => {
              onCloseMenu();
              window.history.back();
            }}
            presets={presets}
            onUpdatePresets={updatePresets}
            onResetAllBeds={resetAll}
          />
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => {
              onCloseMenu();
              window.history.back();
          }} />
        </Suspense>
      )}
    </>
  );
};
