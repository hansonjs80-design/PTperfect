
import React from 'react';
import { Play, ChevronUp, ChevronDown, Minus, Plus, PlusCircle, Trash2, Check, Clock } from 'lucide-react';
import { Preset, TreatmentStep, QuickTreatment } from '../../types';
import { useTreatmentContext } from '../../contexts/TreatmentContext';

interface TreatmentPreviewProps {
  preset: Preset;
  setPreset: React.Dispatch<React.SetStateAction<Preset | null>>;
  onConfirm: () => void;
  actionLabel?: string;
  isLogEdit?: boolean;
}

export const TreatmentPreview: React.FC<TreatmentPreviewProps> = ({ 
  preset, 
  setPreset, 
  onConfirm,
  actionLabel = "치료 시작",
  isLogEdit = false
}) => {
  const { quickTreatments } = useTreatmentContext(); 

  const updateDuration = (idx: number, change: number) => {
    const newSteps = [...preset.steps];
    const newDur = Math.max(60, newSteps[idx].duration + (change * 60));
    newSteps[idx] = { ...newSteps[idx], duration: newDur };
    setPreset({ ...preset, steps: newSteps });
  };

  const moveStep = (idx: number, direction: 'up' | 'down') => {
    const newSteps = [...preset.steps];
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= newSteps.length) return;
    [newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]];
    setPreset({ ...preset, steps: newSteps });
  };

  const removeStep = (idx: number) => {
    const newSteps = preset.steps.filter((_, i) => i !== idx);
    setPreset({ ...preset, steps: newSteps });
  };

  const addTreatment = (template: QuickTreatment) => {
    const newStep: TreatmentStep = {
      id: crypto.randomUUID(),
      name: template.name,
      duration: template.duration * 60,
      enableTimer: template.enableTimer,
      color: template.color
    };
    setPreset({ 
      ...preset, 
      name: preset.steps.length === 0 ? template.name : preset.name,
      steps: [...preset.steps, newStep] 
    });
  };

  const ButtonIcon = isLogEdit ? Check : Play;

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
      
      {/* Selected Preset Info (Like a mini header) */}
      <div className="mb-4">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
          SELECTED PRESET
        </span>
        <div className="flex items-center justify-between">
           <h4 className="text-xl font-black text-slate-800 dark:text-white leading-tight truncate pr-4">
             {preset.steps.length > 0 ? preset.name : "치료 항목 없음"}
           </h4>
           <div className="text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">
             Total {Math.floor(preset.steps.reduce((acc,s)=>acc+s.duration,0)/60)}분
           </div>
        </div>
      </div>

      {/* Steps List (Scrollable) */}
      <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1 mb-4 min-h-[150px]">
        {preset.steps.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50">
            <span className="text-xs font-bold">목록이 비어 있습니다. 아래에서 추가하세요.</span>
          </div>
        ) : (
          preset.steps.map((step, idx) => (
            <div key={idx} className="group flex items-center gap-3 p-2 bg-white dark:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-xl shadow-sm transition-all hover:shadow-md">
              
              {/* Order Handle */}
              <div className="flex flex-col gap-0.5 text-slate-300 group-hover:text-slate-400 transition-colors">
                <button onClick={() => moveStep(idx, 'up')} disabled={idx === 0} className="hover:text-brand-500 disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => moveStep(idx, 'down')} disabled={idx === preset.steps.length - 1} className="hover:text-brand-500 disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5" /></button>
              </div>

              {/* Color Stripe */}
              <div className={`w-1.5 h-10 rounded-full ${step.color}`} />
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">{step.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                   <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-md px-1.5 py-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{Math.floor(step.duration / 60)}분</span>
                   </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                <button onClick={() => updateDuration(idx, -1)} className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500 flex items-center justify-center transition-colors active:scale-95"><Minus className="w-3.5 h-3.5" strokeWidth={3} /></button>
                <button onClick={() => updateDuration(idx, 1)} className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500 flex items-center justify-center transition-colors active:scale-95"><Plus className="w-3.5 h-3.5" strokeWidth={3} /></button>
                <button onClick={() => removeStep(idx)} className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors active:scale-95 ml-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main Action Button */}
      <button 
        onClick={onConfirm}
        disabled={preset.steps.length === 0}
        className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-brand-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mb-4"
      >
        <ButtonIcon className="w-6 h-6 fill-current" />
        {actionLabel}
      </button>

      {/* Quick Add Footer */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2">
          <PlusCircle className="w-3.5 h-3.5" />
          추가 (Add)
        </p>
        <div className="flex flex-wrap gap-2">
          {quickTreatments.map((item) => (
            <button
              key={item.id}
              onClick={() => addTreatment(item)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-brand-500 hover:text-brand-600 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
