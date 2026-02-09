
import { BedState, Preset, BedStatus } from '../types';
import { mapBgToTextClass } from './styleUtils';

export interface RowActiveStatus {
  activeStepColorClass?: string;
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
        if (bed.remainingTime <= 0) {
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
        result.activeStepIndex = bed.currentStepIndex;
      }
    }
  }

  return result;
};
