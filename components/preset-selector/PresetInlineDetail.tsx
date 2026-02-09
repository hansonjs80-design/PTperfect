
import React, { useState } from 'react';
import { Play, Minus, Plus, Trash2, Clock, Check } from 'lucide-react';
import { Preset, TreatmentStep, QuickTreatment } from '../../types';
import { useTreatmentContext } from '../../contexts/TreatmentContext';

interface PresetInlineDetailProps {
  initialPreset: Preset;
  onStart: (preset: Preset) => void;
}

export const PresetInlineDetail: React.FC<PresetInlineDetailProps> = ({ 
  initialPreset, 
  onStart
}) => {
  const { quickTreatments } = useTreatmentContext();
  const [preset, setPreset] = useState<Preset>(JSON.parse(JSON.stringify(initialPreset)));

  const updateDuration = (idx: number, change: number) => {
    const newSteps = [...preset.steps];
    const newDur = Math.max(60, newSteps[idx].duration + (change * 60));
    newSteps[idx] = { ...newSteps[idx], duration: newDur };
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
      steps: [...preset.steps, newStep] 
    });
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 animate-in slide-in-from-top-2 duration-200">
      
      {/* Steps List */}
      <div className="space-y-2 mb-4">
        {preset.steps.length === 0 ? (
          <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
            치료 항목이 없습니다.
          </div>
        ) : (
          preset.steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-700">
              <div className={`w-1 h-8 rounded-full ${step.color} shrink-0`} />
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{step.name}</p>
              </div>

              <div className="flex items-center gap-1">
                {/* Time Display (Left of -/+) */}
                <div className="flex items-center mr-2 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-gray-100 dark:border-slate-600 shadow-sm">
                   <Clock className="w-3 h-3 text-slate-400 mr-1" />
                   <span className="text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">
                     {Math.floor(step.duration / 60)}
                   </span>
                   <span className="text-[10px] font-bold text-slate-400 ml-0.5">분</span>
                </div>

                <button onClick={(e) => { e.stopPropagation(); updateDuration(idx, -1); }} className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-600 rounded-lg text-slate-500 hover:text-slate-700 shadow-sm border border-gray-200 dark:border-slate-500 active:scale-95 transition-all"><Minus className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => { e.stopPropagation(); updateDuration(idx, 1); }} className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-600 rounded-lg text-slate-500 hover:text-slate-700 shadow-sm border border-gray-200 dark:border-slate-500 active:scale-95 transition-all"><Plus className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => { e.stopPropagation(); removeStep(idx); }} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg ml-1 active:scale-95 transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Add */}
      <div className="mb-4">
        <span className="text-[10px] font-bold text-gray-400 block mb-2 px-1">추가하기 (Quick Add)</span>
        <div className="flex flex-wrap gap-1.5">
          {quickTreatments.map((item) => (
            <button
              key={item.id}
              onClick={(e) => { e.stopPropagation(); addTreatment(item); }}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-brand-500 hover:text-brand-600 transition-colors shadow-sm"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onStart(preset); }}
        disabled={preset.steps.length === 0}
        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        <Play className="w-4 h-4 fill-current" />
        치료 시작 ({Math.floor(preset.steps.reduce((acc,s)=>acc+s.duration,0)/60)}분)
      </button>
    </div>
  );
};
