
import React, { memo } from 'react';
import { TreatmentStep, BedState } from '../types';
import { BedEditHeader } from './bed-edit/BedEditHeader';
import { BedEditFlags } from './bed-edit/BedEditFlags';
import { BedEditStepList } from './bed-edit/BedEditStepList';
import { BedEditQuickAdd } from './bed-edit/BedEditQuickAdd';

interface BedEditOverlayProps {
  bed: BedState;
  steps: TreatmentStep[];
  onClose: () => void;
  onToggleInjection?: (bedId: number) => void;
  onToggleFluid?: (bedId: number) => void;
  onToggleTraction?: (bedId: number) => void;
  onToggleESWT?: (bedId: number) => void;
  onToggleManual?: (bedId: number) => void;
  onUpdateSteps?: (bedId: number, steps: TreatmentStep[]) => void;
  onUpdateDuration?: (bedId: number, duration: number) => void;
}

export const BedEditOverlay: React.FC<BedEditOverlayProps> = memo(({
  bed,
  steps,
  onClose,
  onToggleInjection,
  onToggleFluid,
  onToggleTraction,
  onToggleESWT,
  onToggleManual,
  onUpdateSteps,
  onUpdateDuration
}) => {
  // Safety guard
  if (!bed) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full sm:w-[500px] max-h-[90vh] sm:max-h-[95vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all h-[85vh] sm:h-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 1. Header (Fixed) */}
        <BedEditHeader bedId={bed.id} onClose={onClose} />

        {/* 2. Main Body (Flexible) */}
        <div className="flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
           
           {/* Top: Status Flags (Fixed within body) */}
           <div className="shrink-0 p-3 pb-0 z-10">
             <BedEditFlags 
               bed={bed} 
               onToggleInjection={onToggleInjection}
               onToggleFluid={onToggleFluid}
               onToggleManual={onToggleManual}
               onToggleESWT={onToggleESWT}
               onToggleTraction={onToggleTraction}
             />
           </div>

           {/* Middle: Step List (Scrollable Area) */}
           <div className="flex-1 min-h-0 p-3 overflow-y-auto custom-scrollbar">
             <BedEditStepList 
               bed={bed} 
               steps={steps || []} 
               onUpdateSteps={onUpdateSteps}
               onUpdateDuration={onUpdateDuration}
             />
           </div>

           {/* Bottom: Quick Add (Fixed at bottom of body) */}
           <div className="shrink-0 p-3 pt-2 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shadow-lg z-20">
             <BedEditQuickAdd 
               bedId={bed.id} 
               steps={steps || []} 
               onUpdateSteps={onUpdateSteps} 
             />
           </div>
        </div>
        
        {/* 3. Footer Action (Fixed) */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shrink-0 z-30 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
           <button 
             onClick={onClose} 
             className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm rounded-2xl font-bold shadow-lg shadow-slate-300 dark:shadow-none active:scale-[0.98] transition-all"
           >
             수정 완료 (Done)
           </button>
        </div>
      </div>
    </div>
  );
});
