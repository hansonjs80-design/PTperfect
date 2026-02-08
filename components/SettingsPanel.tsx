
import React, { useState, Suspense } from 'react';
import { X, Database, List, Settings as SettingsIcon, Sliders, Loader2 } from 'lucide-react';
import { Preset } from '../types';

// Lazy load tabs to reduce initial bundle size
const SettingsDatabaseTab = React.lazy(() => import('./SettingsDatabaseTab').then(m => ({ default: m.SettingsDatabaseTab })));
const SettingsPresetTab = React.lazy(() => import('./SettingsPresetTab').then(m => ({ default: m.SettingsPresetTab })));
const SettingsPreferencesTab = React.lazy(() => import('./SettingsPreferencesTab').then(m => ({ default: m.SettingsPreferencesTab })));

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  presets: Preset[];
  onUpdatePresets: (presets: Preset[]) => void;
  onResetAllBeds: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  isOpen, 
  onClose, 
  presets, 
  onUpdatePresets,
  onResetAllBeds
}) => {
  const [activeTab, setActiveTab] = useState<'connection' | 'presets' | 'preferences'>('presets');
  
  return (
    <div className={`fixed inset-y-0 left-0 w-full sm:w-[550px] bg-slate-50 dark:bg-slate-950 shadow-2xl transform transition-transform duration-300 z-[60] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-full flex flex-col">
        
        {/* Header: Glassmorphism Style */}
        <div className="shrink-0 pt-[env(safe-area-inset-top)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 z-20">
          <div className="flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400">
                <SettingsIcon className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-0.5">
                  CONFIGURATION
                </span>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-none tracking-tight">
                  설정 및 관리
                </h2>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Segmented Tabs */}
          <div className="px-4 pb-4">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {[
                { id: 'presets', label: '처방 관리', icon: List },
                { id: 'preferences', label: '기본 설정', icon: Sliders },
                { id: 'connection', label: '데이터 연동', icon: Database },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span className={`${activeTab === tab.id ? 'inline' : 'hidden sm:inline'}`}>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 relative">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
              <span className="text-xs font-bold text-slate-400">로딩 중...</span>
            </div>
          }>
            {activeTab === 'connection' && (
              <SettingsDatabaseTab 
                onResetAllBeds={onResetAllBeds} 
                onClosePanel={onClose} 
              />
            )}

            {activeTab === 'presets' && (
              <SettingsPresetTab 
                presets={presets} 
                onUpdatePresets={onUpdatePresets} 
              />
            )}

            {activeTab === 'preferences' && (
              <SettingsPreferencesTab />
            )}
          </Suspense>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
             <span>PhysioTrack Pro v2.1</span>
             <span>Designed for Efficiency</span>
          </div>
        </div>
      </div>
    </div>
  );
};
