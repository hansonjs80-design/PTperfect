
import { BedState, BedStatus, Preset, TreatmentStep, QuickTreatment } from '../types';
import { STANDARD_TREATMENTS } from '../constants';

// --- Formatters ---

export const formatTime = (seconds: number): string => {
  // Safe guard for NaN or undefined/null
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return "0:00";
  }
  const absSeconds = Math.abs(seconds);
  const m = Math.floor(absSeconds / 60);
  const s = absSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const getAbbreviation = (name: string): string => {
  const upper = name.toUpperCase();
  if (upper.includes('HOT PACK') || upper.includes('핫팩')) return 'HP';
  if (upper.includes('ICT')) return 'ICT';
  if (upper.includes('MAGNETIC') || upper.includes('자기장')) return 'Mg';
  if (upper.includes('TRACTION') || upper.includes('견인')) return '견인';
  if (upper.includes('IR') || upper.includes('적외선')) return 'IR';
  if (upper.includes('TENS')) return 'TENS';
  if (upper.includes('LASER') || upper.includes('레이저')) return 'La';
  if (upper.includes('SHOCKWAVE') || upper.includes('충격파')) return 'ES';
  if (upper.includes('EXERCISE') || upper.includes('운동')) return '운동';
  if (upper.includes('ION') || upper.includes('이온')) return 'ION';
  if (upper.includes('COLD') || upper.includes('콜드') || upper.includes('ICE')) return 'Ice';
  if (upper.includes('MICRO') || upper.includes('마이크로') || upper.includes('MW')) return 'MW';
  if (upper.includes('CRYO') || upper.includes('크라이오')) return 'Cryo';
  if (upper.includes('MANUAL') || upper.includes('도수')) return '도수';
  
  if (name.includes('(')) return name.split('(')[0].trim().substring(0, 3);
  return name.substring(0, 3);
};

// Helper to get the display label for a step
export const getStepLabel = (step: TreatmentStep): string => {
  return step.label || getAbbreviation(step.name);
};

export const generateTreatmentString = (steps: TreatmentStep[]) => {
  // Prefer the explicitly set label, fallback to automatic abbreviation
  return steps.map(s => s.label || getAbbreviation(s.name)).join('/');
};

export const parseTreatmentString = (treatmentString: string | null, customTreatments: QuickTreatment[] = []): TreatmentStep[] => {
  if (!treatmentString) return [];

  const referenceList = customTreatments.length > 0 ? customTreatments : STANDARD_TREATMENTS;

  const parts = treatmentString.split('/').map(s => s.trim());
  const reconstructedSteps: TreatmentStep[] = [];
  
  for (const part of parts) {
      if (!part) continue;
      
      const match = referenceList.find(t => 
          t.label.toUpperCase() === part.toUpperCase() || 
          getAbbreviation(t.name).toUpperCase() === part.toUpperCase() ||
          t.name.toUpperCase().includes(part.toUpperCase())
      );

      if (match) {
          reconstructedSteps.push({
              id: crypto.randomUUID(),
              name: match.name,
              label: match.label, // Restore label from reference
              duration: match.duration * 60,
              enableTimer: match.enableTimer,
              color: match.color
          });
      } else {
          reconstructedSteps.push({
              id: crypto.randomUUID(),
              name: part,
              label: part, // Use the part as label for unknown items
              duration: 600, // Default 10 min
              enableTimer: true,
              color: 'bg-gray-500'
          });
      }
  }
  return reconstructedSteps;
};

export const findMatchingPreset = (presets: Preset[], treatmentString: string | null): Preset | undefined => {
  if (!treatmentString) return undefined;

  // 1. Exact Match
  const exactMatch = presets.find(p => generateTreatmentString(p.steps) === treatmentString);
  if (exactMatch) return exactMatch;

  // 2. Reconstruct from string
  const reconstructedSteps = parseTreatmentString(treatmentString);

  if (reconstructedSteps.length > 0) {
      return {
          id: `restored-${Date.now()}`,
          name: '치료 구성 (수정)',
          steps: reconstructedSteps
      };
  }

  return undefined;
};
