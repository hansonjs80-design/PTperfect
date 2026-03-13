import { BedState, Preset, BedStatus } from '../types';
import { mapBgToTextClass } from './styleUtils';

export interface RowActiveStatus {
  activeStepColorClass?: string;
  activeStepBgClass?: string;
  activeStepIndex: number;
  isLastStep: boolean;
  timerStatus: 'normal' | 'warning' | 'overtime';
}

export const getRowActiveStatus = (
  bed: BedState | undefined,
  rowStatus: 'active' | 'completed' | 'none',
  presets: Preset[]
): RowActiveStatus => {
  const result: RowActiveStatus = {
    activeStepIndex: -1,
    isLastStep: false,
    timerStatus: 'normal'
  };

  if ((rowStatus === 'active' || rowStatus === 'completed') && bed) {
    if (bed.status === BedStatus.ACTIVE && !bed.isPaused) {
      const currentPreset = bed.customPreset || presets.find(p => p.id === bed.currentPresetId);
      const currentStepInfo = currentPreset?.steps[bed.currentStepIndex];

      if (currentStepInfo?.enableTimer) {
        if (bed.remainingTime < 0) {
          result.timerStatus = 'overtime';
        } else if (bed.remainingTime < 60) {
          result.timerStatus = 'warning';
        }
      }
    }

    const preset = bed.customPreset || presets.find(p => p.id === bed.currentPresetId);
    const totalSteps = preset?.steps.length || 0;

    result.isLastStep = bed.currentStepIndex === totalSteps - 1;

    const step = preset?.steps[bed.currentStepIndex];

    if (step || rowStatus === 'completed') {
      if (step) {
        result.activeStepColorClass = mapBgToTextClass(step.color);
        result.activeStepBgClass = step.color;
        result.activeStepIndex = bed.currentStepIndex;
      }
    }
  }

  return result;
};

export const formatBodyPartText = (val: string): string => {
  let formattedVal = (val || '').replace(/\b\w/g, (c) => c.toUpperCase());
  const upperCaseWords = ['ITB', 'TFL', 'SIJ', 'LS', 'CT', 'TL', 'TMJ', 'ACL', 'MCL', 'ATFL', 'PV', 'AC', 'SC'];
  const pattern = new RegExp(`\\b(${upperCaseWords.join('|')})\\b`, 'gi');
  formattedVal = formattedVal.replace(pattern, (match) => match.toUpperCase());
  return formattedVal;
};
