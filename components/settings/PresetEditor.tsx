import React, { useState } from 'react';
import { Save, Plus, Trash2, Clock, Minus } from 'lucide-react';
import { Preset, TreatmentStep, QuickTreatment } from '../../types';
import { ColorPicker } from '../common/ColorPicker';

interface PresetEditorProps {
  initialPreset: Preset;
  onSave: (preset: Preset) => void;
  onCancel: () => void;
  quickTreatments: QuickTreatment[];
}

export const PresetEditor: React.FC<PresetEditorProps> = ({ initialPreset, onSave, onCancel, quickTreatments }) => {
  const [editingPreset, setEditingPreset] = useState<Preset>(initialPreset);

  const handleAddCustomStep = () => {
    const newStep: TreatmentStep = {
      id: crypto.randomUUID(),
      name: '새 치료',
      duration: 600,
      enableTimer: true,
      color: 'bg-gray-500'
    };
    setEditingPreset({
      ...editingPreset,
      steps: [...editingPreset.steps, newStep]
    });
  };

  const handleAddStandardStep = (template: QuickTreatment) => {
    const newStep: TreatmentStep = {
      id: crypto.randomUUID(),
      name: template.name,
      duration: template.duration * 60,
      enableTimer: template.enableTimer,
      color: template.color
    };
    setEditingPreset({
      ...editingPreset,
      steps: [...editingPreset.steps, newStep]
    });
  };

  const handleUpdateStep = (stepId: string, updates: Partial<TreatmentStep>) => {
    setEditingPreset({
      ...editingPreset,
      steps: editingPreset.steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
    });
  };

  const handleRemoveStep = (stepId: string) => {
    setEditingPreset({
      ...editingPreset,
      steps: editingPreset.steps.filter(s => s.id !== stepId)
    });
  };

  const handleDurationChange = (stepId: string, currentSeconds: number, changeMinutes: number) => {
    const newDuration = Math.max(60, currentSeconds + (changeMinutes * 60));
    handleUpdateStep(stepId, { duration: newDuration });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-right-2 overflow-hidden">
      
      {/* Header (Fixed) */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 z-10">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
          {initialPreset.id ? '처방 수정' : '새 처방 추가'}
        </h3>
        <div>
          <input 
            type="text" 
            value={editingPreset.name}
            onChange={(e) => setEditingPreset({...editingPreset, name: e.target.value})}
            className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-900 border-gray-300 dark:bg-slate-900 dark:text-white dark:border-slate-600 font-bold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="처방 이름 (예: 기본 물리치료)"
          />
        </div>
      </div>
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 scroll-smooth">
        {/* Step List (Compact Mode) */}
        <div className="space-y-2 mb-6">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">치료 단계 (Steps)</span>
          
          {editingPreset.steps.length === 0 && (
             <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 text-sm">
                등록된 치료가 없습니다. <br/> 아래에서 추가해주세요.
             </div>
          )}

          {editingPreset.steps.map((step, idx) => (
            <div key={step.id} className="bg-white dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-2 flex flex-col gap-2">
              
              {/* Row 1: Index, Name, Delete */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-slate-800 rounded-md text-xs font-black text-gray-500 dark:text-gray-400 shrink-0">
                  {idx + 1}
                </div>
                <input 
                  className="flex-1 min-w-0 bg-transparent text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-b focus:border-brand-500 transition-colors" 
                  value={step.name} 
                  onChange={(e) => handleUpdateStep(step.id, { name: e.target.value })}
                  placeholder="치료명"
                />
                <button 
                  onClick={() => handleRemoveStep(step.id)} 
                  className="text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-lg transition-all active:scale-95 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Row 2: Controls (Duration, Color, Timer) */}
              <div className="flex items-center justify-between gap-2 pl-8">
                
                {/* Duration Control */}
                <div className="flex items-center bg-gray-50 dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-700 overflow-hidden shrink-0">
                  <button onClick={() => handleDurationChange(step.id, step.duration, -1)} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 active:bg-gray-300 transition-colors"><Minus className="w-3 h-3" /></button>
                  <div className="w-10 text-center text-xs font-black text-gray-800 dark:text-gray-200 leading-none">{step.duration / 60}분</div>
                  <button onClick={() => handleDurationChange(step.id, step.duration, 1)} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 text-brand-600 active:bg-gray-300 transition-colors"><Plus className="w-3 h-3" /></button>
                </div>

                <div className="flex items-center gap-2">
                    {/* Color Select */}
                    <ColorPicker 
                      value={step.color} 
                      onChange={(color) => handleUpdateStep(step.id, { color })} 
                    />

                    {/* Timer Toggle */}
                    <button
                        onClick={() => handleUpdateStep(step.id, { enableTimer: !step.enableTimer })}
                        className={`p-1.5 rounded-md border transition-all ${
                        step.enableTimer 
                            ? 'bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-900/30 dark:border-brand-800 dark:text-brand-400' 
                            : 'bg-white border-gray-200 text-gray-300 dark:bg-slate-800 dark:border-slate-700'
                        }`}
                        title="타이머 사용 여부"
                    >
                        <Clock className="w-3.5 h-3.5" />
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Add Section */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">치료 추가 (Quick Add)</span>
          <div className="grid grid-cols-3 xs:grid-cols-4 gap-2">
            {quickTreatments.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleAddStandardStep(item)}
                  className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all active:scale-95 group shadow-sm h-14"
                >
                  <span className="text-[10px] font-black text-gray-700 dark:text-gray-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate w-full text-center">
                    {item.label}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500">
                    {item.duration}분
                  </span>
                </button>
            ))}
            <button 
              onClick={handleAddCustomStep} 
              className="flex flex-col items-center justify-center p-2 border border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 transition-all active:scale-95 h-14"
            >
              <Plus className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] font-bold">직접 입력</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer (Fixed) */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 shrink-0 z-10">
        <div className="flex gap-3">
            <button onClick={() => onSave(editingPreset)} className="flex-1 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 flex justify-center items-center shadow-lg shadow-brand-200 dark:shadow-none font-bold text-sm transition-transform active:scale-98">
            <Save className="w-4 h-4 mr-2" /> 저장하기
            </button>
            <button onClick={onCancel} className="flex-1 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm font-bold text-sm transition-transform active:scale-98 border border-gray-200 dark:border-slate-600">
            취소
            </button>
        </div>
      </div>
    </div>
  );
};