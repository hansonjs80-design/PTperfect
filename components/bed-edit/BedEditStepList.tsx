
import React from 'react';
import { BedState, TreatmentStep } from '../../types';
import { BedEditStepRow } from './BedEditStepRow';
import { ListOrdered } from 'lucide-react';

interface BedEditStepListProps {
  bed: BedState;
  steps: TreatmentStep[];
  onUpdateSteps?: (bedId: number, steps: TreatmentStep[]) => void;
  onUpdateDuration?: (bedId: number, duration: number) => void;
}

export const BedEditStepList: React.FC<BedEditStepListProps> = ({ 
  bed, 
  steps, 
  onUpdateSteps,
  onUpdateDuration 
}) => {
  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    if (!onUpdateSteps) return;
    const newSteps = [...steps];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newSteps.length) return;
    
    [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
    onUpdateSteps(bed.id, newSteps);
  };

  const handleRemoveStep = (idx: number) => {
    if (!onUpdateSteps) return;
    const newSteps = steps.filter((_, i) => i !== idx);
    onUpdateSteps(bed.id, newSteps);
  };

  const handleStepChange = (idx: number, updates: Partial<TreatmentStep>) => {
    if (!onUpdateSteps) return;
    const newSteps = [...steps];
    newSteps[idx] = { ...newSteps[idx], ...updates };
    onUpdateSteps(bed.id, newSteps);
  };

  const handleDurationChange = (idx: number, changeMinutes: number) => {
    if (!onUpdateSteps) return;
    const newSteps = [...steps];
    const currentSeconds = newSteps[idx].duration;
    const newSeconds = currentSeconds + (changeMinutes * 60);

    if (newSeconds >= 60) {
      newSteps[idx] = { ...newSteps[idx], duration: newSeconds };
      onUpdateSteps(bed.id, newSteps);
    }
  };
  
  const handleApplyDuration = (duration: number) => {
    if (onUpdateDuration) {
        onUpdateDuration(bed.id, duration);
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <ListOrdered className="w-3.5 h-3.5" />
          처방 순서 (Steps)
        </span>
        <span className="text-[10px] font-bold text-slate-400">
          Total: {steps.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
        {steps.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50">
            <span className="text-xs font-bold">등록된 치료가 없습니다.</span>
            <span className="text-[10px] opacity-70">아래에서 추가해주세요.</span>
          </div>
        ) : (
          steps.map((step, idx) => (
             <BedEditStepRow 
               key={step.id || idx}
               step={step}
               index={idx}
               isActive={idx === bed.currentStepIndex && bed.status === 'ACTIVE'}
               totalSteps={steps.length}
               onMove={handleMoveStep}
               onRemove={handleRemoveStep}
               onChange={handleStepChange}
               onDurationChange={handleDurationChange}
               onApplyDuration={idx === bed.currentStepIndex ? handleApplyDuration : undefined}
             />
          ))
        )}
      </div>
    </div>
  );
};
