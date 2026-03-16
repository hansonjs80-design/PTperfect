
import { BedState, BedStatus, Preset, TreatmentStep, QuickTreatment } from '../types';
import { STANDARD_TREATMENTS } from '../constants';

// --- Formatters ---

const STEP_LABEL_ALIASES: Record<string, string[]> = {
  'H': ['핫팩 (Hot Pack)', 'HOT PACK'],
  'HP': ['핫팩 (Hot Pack)', 'HOT PACK'],
  '자': ['자기장 (Magnetic)', 'MAGNETIC'],
  'MG': ['자기장 (Magnetic)', 'MAGNETIC'],
  'LA': ['Laser', 'LASER', '레이저'],
};

const matchByAlias = (part: string, list: QuickTreatment[]): QuickTreatment | undefined => {
  const alias = STEP_LABEL_ALIASES[part.toUpperCase()];
  if (!alias) return undefined;
  const upperAliases = alias.map((v) => v.toUpperCase());
  return list.find((t) => {
    const upperName = t.name.toUpperCase();
    const upperLabel = (t.label || '').toUpperCase();
    return upperAliases.some((a) => upperName.includes(a) || upperLabel === a);
  });
};


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

export const normalizeTreatmentString = (value: string | null | undefined): string => {
  if (!value) return '';
  return value
    .split(/[\/,]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .join('/');
};

export const findExactPresetByTreatmentString = (presets: Preset[], treatmentString: string | null | undefined): Preset | undefined => {
  const normalizedTarget = normalizeTreatmentString(treatmentString);
  if (!normalizedTarget) return undefined;

  return presets.find((preset) => normalizeTreatmentString(generateTreatmentString(preset.steps)) === normalizedTarget);
};

export const parseTreatmentString = (treatmentString: string | null, customTreatments: QuickTreatment[] = []): TreatmentStep[] => {
  if (!treatmentString) return [];

  const referenceList = customTreatments.length > 0 ? customTreatments : STANDARD_TREATMENTS;

  const parts = treatmentString.split(/[\/,]+/).map(s => s.trim());
  const reconstructedSteps: TreatmentStep[] = [];

  for (const part of parts) {
    if (!part) continue;

    const upperPart = part.toUpperCase();
    const findBy = (predicate: (t: QuickTreatment) => boolean) => referenceList.find(predicate);

    // 0) 현장 약어 별칭 우선 (H/자 등)
    let match = matchByAlias(part, referenceList);

    // 1) 정확 매칭 우선 (라벨/약어/이름)
    if (!match) match = findBy((t) => (t.label || '').toUpperCase() === upperPart);
    if (!match) match = findBy((t) => getAbbreviation(t.name).toUpperCase() === upperPart);
    if (!match) match = findBy((t) => t.name.toUpperCase() === upperPart);

    // 2) 접두 매칭 (오입력 보정)
    if (!match) {
      match = findBy((t) =>
        t.name.toUpperCase().startsWith(upperPart) ||
        (t.label || '').toUpperCase().startsWith(upperPart)
      );
    }

    // 3) 포함 매칭은 마지막 fallback으로만 사용 (한 글자/짧은 토큰 오인식 방지)
    if (!match && part.length >= 2) {
      match = findBy((t) => t.name.toUpperCase().includes(upperPart));
    }

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

export const findMatchingPreset = (presets: Preset[], treatmentString: string | null, customTreatments: QuickTreatment[] = []): Preset | undefined => {
  if (!treatmentString) return undefined;

  // 1. Exact Match
  const exactMatch = findExactPresetByTreatmentString(presets, treatmentString);
  if (exactMatch) return exactMatch;

  // 2. Reconstruct from string
  const reconstructedSteps = parseTreatmentString(treatmentString, customTreatments);

  if (reconstructedSteps.length > 0) {
    return {
      id: `restored-${Date.now()}`,
      name: '치료 구성 (수정)',
      steps: reconstructedSteps
    };
  }

  return undefined;
};
