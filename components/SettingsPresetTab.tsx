
import React, { useState } from 'react';
import { Preset, QuickTreatment } from '../types';
import { PresetList } from './settings/PresetList';
import { PresetEditor } from './settings/PresetEditor';
import { QuickTreatmentList } from './settings/QuickTreatmentList';
import { QuickTreatmentEditor } from './settings/QuickTreatmentEditor';
import { useTreatmentContext } from '../contexts/TreatmentContext';

interface SettingsPresetTabProps {
  presets: Preset[];
  onUpdatePresets: (presets: Preset[]) => void;
}

export const SettingsPresetTab: React.FC<SettingsPresetTabProps> = ({ presets, onUpdatePresets }) => {
  const { quickTreatments, updateQuickTreatments } = useTreatmentContext();
  const [subTab, setSubTab] = useState<'presets' | 'quick'>('presets');
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [editingQuick, setEditingQuick] = useState<QuickTreatment | null>(null);

  // --- Preset Handlers ---
  const handleSavePreset = (preset: Preset) => {
    const existingIndex = presets.findIndex(p => p.id === preset.id);
    if (existingIndex >= 0) {
      const newPresets = [...presets];
      newPresets[existingIndex] = preset;
      onUpdatePresets(newPresets);
    } else {
      onUpdatePresets([...presets, preset]);
    }
    setEditingPreset(null);
  };

  const handleDeletePreset = (id: string) => {
    onUpdatePresets(presets.filter(p => p.id !== id));
  };

  // --- Quick Treatment Handlers ---
  const handleSaveQuick = (item: QuickTreatment) => {
    const existingIndex = quickTreatments.findIndex(q => q.id === item.id);
    if (existingIndex >= 0) {
      const newItems = [...quickTreatments];
      newItems[existingIndex] = item;
      updateQuickTreatments(newItems);
    } else {
      updateQuickTreatments([...quickTreatments, item]);
    }
    setEditingQuick(null);
  };

  const handleDeleteQuick = (id: string) => {
    updateQuickTreatments(quickTreatments.filter(q => q.id !== id));
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Sub Tabs Pill Style */}
      <div className="flex justify-center mb-4 shrink-0">
        <div className="flex p-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
          <button
            onClick={() => setSubTab('presets')}
            className={`flex-1 sm:w-32 py-1.5 text-xs font-bold rounded-lg transition-all ${
              subTab === 'presets' 
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm ring-1 ring-black/5' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            세트 처방
          </button>
          <button
            onClick={() => setSubTab('quick')}
            className={`flex-1 sm:w-32 py-1.5 text-xs font-bold rounded-lg transition-all ${
              subTab === 'quick' 
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm ring-1 ring-black/5' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            단일 치료
          </button>
        </div>
      </div>

      <div className="flex-1 h-full min-h-0 relative">
        {subTab === 'presets' ? (
          <>
            {editingPreset ? (
              <PresetEditor 
                initialPreset={editingPreset}
                onSave={handleSavePreset}
                onCancel={() => setEditingPreset(null)}
                quickTreatments={quickTreatments}
              />
            ) : (
              <PresetList 
                presets={presets}
                onEdit={setEditingPreset}
                onDelete={handleDeletePreset}
                onCreate={() => setEditingPreset({ id: crypto.randomUUID(), name: '새 처방', steps: [] })}
                onUpdatePresets={onUpdatePresets}
              />
            )}
          </>
        ) : (
          <>
            {editingQuick ? (
              <QuickTreatmentEditor
                initialItem={editingQuick}
                onSave={handleSaveQuick}
                onCancel={() => setEditingQuick(null)}
              />
            ) : (
              <QuickTreatmentList
                items={quickTreatments}
                onEdit={setEditingQuick}
                onDelete={handleDeleteQuick}
                onCreate={() => setEditingQuick({ 
                   id: crypto.randomUUID(), 
                   name: '새 치료', 
                   label: 'New', 
                   duration: 10, 
                   color: 'bg-gray-500', 
                   enableTimer: true 
                })}
                onUpdateItems={updateQuickTreatments}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
