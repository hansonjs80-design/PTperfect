import React, { memo, useMemo, useState } from 'react';
import { BedState, Preset, QuickTreatment, TreatmentStep } from '../types';
import { BedEditHeader } from './bed-edit/BedEditHeader';
import { BedEditFlags } from './bed-edit/BedEditFlags';
import { BedEditStepList } from './bed-edit/BedEditStepList';
import { BedEditQuickAdd } from './bed-edit/BedEditQuickAdd';
import { PresetListView } from './preset-selector/PresetListView';
import { QuickStartGrid } from './preset-selector/QuickStartGrid';
import { createQuickStep } from '../utils/treatmentFactories';

interface BedEditOverlayProps {
  bed: BedState;
  steps: TreatmentStep[];
  presets: Preset[];
  quickTreatments: QuickTreatment[];
  onClose: () => void;
  onToggleInjection?: (bedId: number) => void;
  onToggleFluid?: (bedId: number) => void;
  onToggleTraction?: (bedId: number) => void;
  onToggleESWT?: (bedId: number) => void;
  onToggleManual?: (bedId: number) => void;
  onUpdateSteps?: (bedId: number, steps: TreatmentStep[], newStepIndex?: number) => void;
  onUpdateDuration?: (bedId: number, duration: number) => void;
}

export const BedEditOverlay: React.FC<BedEditOverlayProps> = memo(({
  bed,
  steps,
  presets,
  quickTreatments,
  onClose,
  onToggleInjection,
  onToggleFluid,
  onToggleTraction,
  onToggleESWT,
  onToggleManual,
  onUpdateSteps,
  onUpdateDuration
}) => {
  const [selectedQuickItems, setSelectedQuickItems] = useState<QuickTreatment[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(true);

  // Safety guard
  if (!bed) return null;

  const safePresets = useMemo(() => (Array.isArray(presets) ? presets : []), [presets]);
  const hasQuickTreatments = quickTreatments.length > 0;

  const applyPresetSteps = (nextSteps: TreatmentStep[]) => {
    if (!onUpdateSteps) return;
    onUpdateSteps(bed.id, nextSteps, 0);
    setSelectedQuickItems([]);
  };

  const handleQuickItemClick = (template: QuickTreatment) => {
    if (!isMultiSelectMode) {
      applyPresetSteps([
        createQuickStep(template.name, template.duration, template.enableTimer, template.color, template.label)
      ]);
      return;
    }

    setSelectedQuickItems(prev => {
      const exists = prev.some(item => item.id === template.id);
      if (exists) {
        return prev.filter(item => item.id !== template.id);
      }
      return [...prev, template];
    });
  };

  const handleApplySelectedQuick = () => {
    if (selectedQuickItems.length === 0) return;

    const quickSteps = selectedQuickItems.map(item =>
      createQuickStep(item.name, item.duration, item.enableTimer, item.color, item.label)
    );
    applyPresetSteps(quickSteps);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[500px] max-h-[90vh] sm:max-h-[95vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all h-[85vh] sm:h-auto"
        onClick={e => e.stopPropagation()}
      >
        <BedEditHeader bedId={bed.id} onClose={onClose} />

        <div className="flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-slate-950 relative overflow-hidden landscape:overflow-y-auto lg:landscape:overflow-hidden">
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

          <div className="flex-1 min-h-0 p-3 overflow-y-auto custom-scrollbar landscape:overflow-visible landscape:h-auto landscape:flex-none lg:landscape:flex-1 lg:landscape:overflow-y-auto lg:landscape:h-full lg:landscape:min-h-0">
            <BedEditStepList
              bed={bed}
              steps={steps || []}
              onUpdateSteps={onUpdateSteps}
              onUpdateDuration={onUpdateDuration}
            />

            <div className="mt-3 rounded-2xl border border-brand-200/80 dark:border-brand-800/70 bg-white dark:bg-slate-900 p-3 space-y-3">
              <div>
                <h4 className="text-sm font-black text-brand-700 dark:text-brand-300">세트 목록으로 한번에 수정</h4>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">치료 시작 창과 같은 목록에서 선택하여 현재 처방을 즉시 교체합니다.</p>
              </div>

              <PresetListView
                presets={safePresets}
                onSelect={(preset) => applyPresetSteps(preset.steps)}
              />

              {hasQuickTreatments ? (
                <QuickStartGrid
                  onQuickItemClick={handleQuickItemClick}
                  selectedItems={selectedQuickItems}
                  isMultiSelect={isMultiSelectMode}
                  onToggleMultiSelect={() => setIsMultiSelectMode(prev => !prev)}
                  onStartSelected={handleApplySelectedQuick}
                />
              ) : (
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">빠른 치료 목록이 없어 세트 처방만 선택할 수 있습니다.</p>
              )}
            </div>
          </div>

          <div className="shrink-0 p-3 pt-2 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shadow-lg z-20">
            <BedEditQuickAdd
              bedId={bed.id}
              steps={steps || []}
              onUpdateSteps={onUpdateSteps}
            />
          </div>
        </div>

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
