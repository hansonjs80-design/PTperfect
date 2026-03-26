
import React, { useMemo, useState } from 'react';
import { TreatmentStep, QuickTreatment } from '../../types';
import { Check, Layers3, Plus, Square } from 'lucide-react';
import { useTreatmentContext } from '../../contexts/TreatmentContext';

interface BedEditQuickAddProps {
  bedId: number;
  steps: TreatmentStep[];
  onUpdateSteps?: (bedId: number, steps: TreatmentStep[]) => void;
}

export const BedEditQuickAdd: React.FC<BedEditQuickAddProps> = ({ bedId, steps, onUpdateSteps }) => {
  const { quickTreatments } = useTreatmentContext();
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(true);
  const [selectedQuickIds, setSelectedQuickIds] = useState<string[]>([]);

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

  const handleToggleQuick = (template: QuickTreatment) => {
    if (!isMultiSelectMode) {
      handleAddStandardStep(template);
      return;
    }

    setSelectedQuickIds((prev) =>
      prev.includes(template.id)
        ? prev.filter((id) => id !== template.id)
        : [...prev, template.id]
    );
  };

  const selectedQuickTreatments = useMemo(
    () => quickTreatments.filter((item) => selectedQuickIds.includes(item.id)),
    [quickTreatments, selectedQuickIds]
  );

  const handleApplySelectedQuick = () => {
    if (!onUpdateSteps || selectedQuickTreatments.length === 0) return;

    const nextSteps = [...steps, ...selectedQuickTreatments.map((template) => ({
      id: crypto.randomUUID(),
      name: template.name,
      duration: template.duration * 60,
      enableTimer: template.enableTimer,
      color: template.color
    }))];

    onUpdateSteps(bedId, nextSteps);
    setSelectedQuickIds([]);
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

        <button
          type="button"
          onClick={() => {
            setIsMultiSelectMode((prev) => !prev);
            setSelectedQuickIds([]);
          }}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black transition-all ${
            isMultiSelectMode
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
          }`}
          title="빠른 추가 다중 선택"
        >
          <Layers3 className="w-3 h-3" />
          {isMultiSelectMode ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quickTreatments.map((item) => {
          const isSelected = selectedQuickIds.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleToggleQuick(item)}
              className={`group inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border transition-all active:scale-95 shadow-sm ${
                isSelected
                  ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-400 text-brand-700 dark:text-brand-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-slate-500'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{item.label}</span>
              {isMultiSelectMode && (
                isSelected ? <Check className="w-3 h-3 text-brand-600" /> : <Square className="w-3 h-3 text-slate-400" />
              )}
            </button>
          );
        })}
        <button
          onClick={handleAddCustomStep}
          className="inline-flex items-center gap-1 py-1.5 px-3 border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
        >
          <Plus className="w-3 h-3" />
          <span className="text-[10px] font-bold">직접</span>
        </button>
      </div>

      {isMultiSelectMode && selectedQuickTreatments.length > 0 && (
        <button
          type="button"
          onClick={handleApplySelectedQuick}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-600 text-white text-[11px] font-black hover:bg-brand-700 active:scale-[0.99] transition-all"
        >
          <Check className="w-3.5 h-3.5" />
          선택한 {selectedQuickTreatments.length}개 빠른 추가
        </button>
      )}
    </div>
  );
};