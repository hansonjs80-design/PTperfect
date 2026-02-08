
import React from 'react';
import { TreatmentStep, QuickTreatment } from '../../types';
import { Plus } from 'lucide-react';
import { useTreatmentContext } from '../../contexts/TreatmentContext';

interface BedEditQuickAddProps {
  bedId: number;
  steps: TreatmentStep[];
  onUpdateSteps?: (bedId: number, steps: TreatmentStep[]) => void;
}

export const BedEditQuickAdd: React.FC<BedEditQuickAddProps> = ({ bedId, steps, onUpdateSteps }) => {
  const { quickTreatments } = useTreatmentContext();

  const handleAddStandardStep = (template: QuickTreatment) => {
    if (!onUpdateSteps) return;
    const newStep: TreatmentStep = {
      id: crypto.randomUUID(),
      name: template.name,
      duration: template.duration * 60,
      enableTimer: template.enableTimer,
      color: template.color
    };
    onUpdateSteps(bedId, [...steps, newStep]);
  };

  const handleAddCustomStep = () => {
    if (!onUpdateSteps) return;
    const newStep: TreatmentStep = {
        id: crypto.randomUUID(),
        name: '직접 입력',
        duration: 10 * 60, // 10 min default
        enableTimer: true,
        color: 'bg-gray-500'
    };
    onUpdateSteps(bedId, [...steps, newStep]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
           <Plus className="w-3 h-3" />
           빠른 추가 (Quick Add)
        </span>
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {quickTreatments.map((item) => (
          <button
            key={item.id}
            onClick={() => handleAddStandardStep(item)}
            className="group flex items-center gap-1.5 py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-slate-500 rounded-full transition-all active:scale-95 shadow-sm"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400">{item.label}</span>
          </button>
        ))}
        {/* 직접 추가 버튼 */}
        <button
            onClick={handleAddCustomStep}
            className="flex items-center gap-1 py-1.5 px-3 border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-all active:scale-95"
        >
            <Plus className="w-3 h-3" />
            <span className="text-[10px] font-bold">직접</span>
        </button>
      </div>
    </div>
  );
};
