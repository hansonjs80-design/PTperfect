
import { Preset, TreatmentStep } from '../types';
import { getAbbreviation } from './bedUtils';

export const createQuickStep = (
  name: string, 
  minutes: number, 
  enableTimer: boolean, 
  color: string,
  label?: string
): TreatmentStep => ({
  id: crypto.randomUUID(),
  name,
  label: label || getAbbreviation(name),
  duration: minutes * 60,
  enableTimer,
  color
});

export const createCustomPreset = (name: string, steps: TreatmentStep[]): Preset => ({
  id: `custom-${Date.now()}`,
  name,
  steps
});

export const createTractionPreset = (durationMinutes: number): Preset => ({
  id: `traction-${Date.now()}`,
  name: '견인 치료',
  steps: [{ 
    id: 'tr', 
    name: '견인 (Traction)',
    label: '견인', 
    duration: durationMinutes * 60, 
    enableTimer: true, 
    color: 'bg-orange-500' 
  }]
});

export const createSwappedPreset = (
  originalPreset: Preset | undefined,
  currentPresetId: string | null,
  fallbackPresets: Preset[],
  idx1: number,
  idx2: number
): { preset: Preset; steps: TreatmentStep[] } | null => {
  
  let steps = [...(originalPreset?.steps || fallbackPresets.find(p => p.id === currentPresetId)?.steps || [])];
  
  if (steps.length === 0) return null;
  if (idx1 < 0 || idx1 >= steps.length || idx2 < 0 || idx2 >= steps.length) return null;

  [steps[idx1], steps[idx2]] = [steps[idx2], steps[idx1]];

  const newCustomPreset: Preset = {
     id: originalPreset?.id || `custom-swap-${Date.now()}`,
     name: originalPreset?.name || (fallbackPresets.find(p => p.id === currentPresetId)?.name || 'Custom'),
     steps: steps
  };

  return { preset: newCustomPreset, steps };
};
