
import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { X, Play, ChevronLeft, Eraser, Check, Clock, Edit3 } from 'lucide-react';
import { Preset, TreatmentStep, QuickTreatment } from '../types';
import { OptionToggles } from './preset-selector/OptionToggles';
import { PresetListView } from './preset-selector/PresetListView';
import { QuickStartGrid } from './preset-selector/QuickStartGrid';
import { TreatmentPreview } from './preset-selector/TreatmentPreview';
import { createQuickStep } from '../utils/treatmentFactories';

interface PresetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: Preset[];
  onSelect: (bedId: number, presetId: string, options: any) => void;
  onCustomStart: (bedId: number, name: string, steps: TreatmentStep[], options: any) => void;
  onQuickStart: (bedId: number, template: QuickTreatment, options: any) => void;
  onStartTraction: (bedId: number, duration: number, options: any) => void;
  onClearLog?: () => void;
  targetBedId: number | null;
  initialOptions?: {
    isInjection: boolean;
    isManual: boolean;
    isESWT: boolean;
    isTraction: boolean;
    isFluid: boolean;
  };
  initialPreset?: Preset;
}

export const PresetSelectorModal: React.FC<PresetSelectorModalProps> = memo(({
  isOpen,
  onClose,
  presets = [], // Default empty array to prevent map errors
  onSelect,
  onCustomStart,
  onQuickStart,
  onStartTraction,
  onClearLog,
  targetBedId,
  initialOptions,
  initialPreset
}) => {
  const [tractionDuration, setTractionDuration] = useState(15);
  const [previewPreset, setPreviewPreset] = useState<Preset | null>(null);
  
  // Multi-select state for Quick Treatments
  const [selectedQuickItems, setSelectedQuickItems] = useState<QuickTreatment[]>([]);
  // Default to true
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(true);

  const [options, setOptions] = useState({
    isInjection: false,
    isManual: false,
    isESWT: false,
    isTraction: false,
    isFluid: false
  });

  useEffect(() => {
    if (isOpen) {
      if (initialOptions) {
        setOptions(initialOptions);
      } else {
        setOptions({ isInjection: false, isManual: false, isESWT: false, isTraction: false, isFluid: false });
      }
      
      if (initialPreset) {
        // Deep copy to prevent mutating the original preset in context
        try {
            setPreviewPreset(JSON.parse(JSON.stringify(initialPreset)));
        } catch (e) {
            console.error("Failed to parse initialPreset", e);
            setPreviewPreset(null);
        }
      } else {
        setPreviewPreset(null);
      }
      // Reset multi-select state on open (Default to ON)
      setSelectedQuickItems([]);
      setIsMultiSelectMode(true);
    }
  }, [isOpen, initialOptions, initialPreset]);

  // Handle Quick Item Click (Single vs Multi logic)
  const handleQuickItemClick = useCallback((template: QuickTreatment) => {
    if (isMultiSelectMode) {
      // Toggle selection in multi mode
      setSelectedQuickItems(prev => {
        const exists = prev.find(item => item.id === template.id);
        if (exists) {
          return prev.filter(item => item.id !== template.id);
        } else {
          return [...prev, template];
        }
      });
    } else {
      // Immediate start in single mode
      if (targetBedId !== null) {
          onQuickStart(targetBedId, template, options);
      }
    }
  }, [isMultiSelectMode, onQuickStart, targetBedId, options]);

  // Handle Starting Multiple Selected Items
  const handleStartSelectedQuick = () => {
    if (selectedQuickItems.length === 0 || targetBedId === null) return;

    const steps: TreatmentStep[] = selectedQuickItems.map(item => 
      createQuickStep(item.name, item.duration, item.enableTimer, item.color, item.label)
    );

    // Create a combined name (e.g., "HP + ICT + Laser")
    const combinedName = selectedQuickItems.map(i => i.label || i.name).join(' + ');

    onCustomStart(targetBedId, combinedName, steps, options);
  };

  const handlePresetStart = (preset: Preset) => {
      if (targetBedId !== null) {
          onCustomStart(targetBedId, preset.name, preset.steps, options);
      }
  };

  const handleTractionStart = () => {
    if (targetBedId !== null) {
        onStartTraction(targetBedId, tractionDuration, options);
    }
  };

  const handleConfirmStart = () => {
    if (previewPreset && targetBedId !== null) {
      onCustomStart(targetBedId, previewPreset.name, previewPreset.steps, options);
    }
  };

  // Safety check: Don't render if not open or no target (unless log edit where bedId can be 0)
  if (!isOpen || targetBedId === null) return null;

  const isTractionBed = targetBedId === 11;
  const isLogMode = targetBedId === 0;

  const getHeaderStyle = () => {
    if (isLogMode) return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200';
    if (targetBedId === 11) return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300';
    if (targetBedId >= 7) return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300';
    if (targetBedId >= 3) return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300';
    return 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300';
  };

  // Ensure presets is safe to map
  const safePresets = useMemo(() => Array.isArray(presets) ? presets : [], [presets]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full sm:w-[500px] max-h-[90vh] sm:max-h-[95vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-4 py-3 sm:px-5 sm:py-4 flex justify-between items-center shrink-0 transition-colors ${getHeaderStyle()}`}>
          <div className="flex items-center gap-3">
            {previewPreset && (
              <button 
                onClick={() => setPreviewPreset(null)}
                className="p-1 -ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            
            {/* New Single Row Layout */}
            <div className="flex items-center gap-3">
                {/* Circle Badge - Solid White Background */}
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0 ring-2 ring-white/30 dark:ring-slate-700/30">
                    <span className="text-xl font-black leading-none text-current opacity-90 pb-0.5">
                        {isLogMode ? <Edit3 className="w-5 h-5" /> : (isTractionBed ? 'T' : targetBedId)}
                    </span>
                </div>
                
                {/* Title Text */}
                <h3 className="text-xl sm:text-2xl font-black leading-none tracking-tight opacity-90">
                    {previewPreset ? '설정 확인' : (isLogMode ? '처방 수정' : '치료 시작')}
                </h3>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 rounded-full transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Options Area */}
        <OptionToggles options={options} setOptions={setOptions} />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 p-2 sm:p-3 relative">
          {previewPreset ? (
             <TreatmentPreview 
               preset={previewPreset} 
               setPreset={setPreviewPreset} 
               onConfirm={handleConfirmStart} 
               actionLabel={isLogMode ? "수정 완료" : "치료 시작"}
               isLogEdit={isLogMode}
             />
          ) : isTractionBed ? (
            // Traction Specific UI
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-8 p-4">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500 blur-[60px] opacity-10 rounded-full"></div>
                <div className="relative w-48 h-48 rounded-full border-[6px] border-orange-100 dark:border-orange-900/30 flex flex-col items-center justify-center bg-white dark:bg-slate-900 shadow-xl">
                   <Clock className="w-6 h-6 text-orange-400 mb-2 opacity-50" />
                   <span className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter">
                     {tractionDuration}
                   </span>
                   <span className="text-sm font-bold text-gray-400 mt-1">MINUTES</span>
                </div>
                <button 
                  onClick={() => setTractionDuration(Math.max(1, tractionDuration - 1))}
                  className="absolute top-1/2 -left-6 -translate-y-1/2 w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 flex items-center justify-center text-xl font-black text-slate-600 dark:text-slate-300 active:scale-90 transition-transform hover:bg-gray-50"
                >
                  -
                </button>
                <button 
                  onClick={() => setTractionDuration(tractionDuration + 1)}
                  className="absolute top-1/2 -right-6 -translate-y-1/2 w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 flex items-center justify-center text-xl font-black text-slate-600 dark:text-slate-300 active:scale-90 transition-transform hover:bg-gray-50"
                >
                  +
                </button>
              </div>

              <div className="flex gap-2">
                 {[10, 15, 20].map(min => (
                   <button 
                     key={min}
                     onClick={() => setTractionDuration(min)}
                     className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tractionDuration === min ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105' : 'bg-white dark:bg-slate-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                   >
                     {min}분
                   </button>
                 ))}
              </div>

              <button 
                onClick={handleTractionStart} 
                className="w-full max-w-xs py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20 transition-all active:scale-95"
              >
                {isLogMode ? <Check className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />} 
                {isLogMode ? '수정 완료' : '견인 치료 시작'}
              </button>
            </div>
          ) : (
            // Standard Preset & Quick List
            <div className="flex flex-col gap-4 pb-20">
              <PresetListView 
                presets={safePresets} 
                onSelect={handlePresetStart} 
              />
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-50 dark:bg-slate-950 px-3 text-xs font-bold text-gray-400">OR</span>
                </div>
              </div>

              <QuickStartGrid 
                onQuickItemClick={handleQuickItemClick}
                selectedItems={selectedQuickItems}
                isMultiSelect={isMultiSelectMode}
                onToggleMultiSelect={() => setIsMultiSelectMode(prev => !prev)}
                onStartSelected={handleStartSelectedQuick}
              />
            </div>
          )}
        </div>
        
        {/* Bottom Actions (Only for Log Mode or standard footer) */}
        {isLogMode && onClearLog && !previewPreset && !isTractionBed && (
           <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shrink-0">
             <button 
               onClick={() => { onClearLog(); onClose(); }} 
               className="w-full py-3 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/30 rounded-2xl transition-colors flex items-center justify-center gap-2"
             >
               <Eraser className="w-4 h-4" />
               데이터 비우기 (Clear)
             </button>
           </div>
        )}
      </div>
    </div>
  );
});
