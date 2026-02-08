
import React, { useState, useEffect, memo } from 'react';
import { X, Play, ChevronLeft, Eraser, Check, Clock } from 'lucide-react';
import { Preset, TreatmentStep, QuickTreatment } from '../types';
import { OptionToggles } from './preset-selector/OptionToggles';
import { PresetListView } from './preset-selector/PresetListView';
import { QuickStartGrid } from './preset-selector/QuickStartGrid';
import { TreatmentPreview } from './preset-selector/TreatmentPreview';

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
  presets,
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
        setPreviewPreset(JSON.parse(JSON.stringify(initialPreset)));
      } else {
        setPreviewPreset(null);
      }
    }
  }, [isOpen, initialOptions, initialPreset]);

  if (!isOpen || targetBedId === null) return null;

  const isTractionBed = targetBedId === 11;
  const isLogMode = targetBedId === 0;

  const handleTractionStart = () => {
    onStartTraction(targetBedId, tractionDuration, options);
    onClose();
  };

  const handleConfirmStart = () => {
    if (previewPreset) {
      onCustomStart(targetBedId, previewPreset.name, previewPreset.steps, options);
      onClose();
    }
  };

  const handleQuickItemClick = (template: QuickTreatment) => {
    const initialStep: TreatmentStep = {
      id: crypto.randomUUID(),
      name: template.name,
      duration: template.duration * 60,
      enableTimer: template.enableTimer,
      color: template.color
    };

    setPreviewPreset({
      id: `temp-${Date.now()}`,
      name: template.name,
      steps: [initialStep]
    });
  };

  // --- Dynamic Header Style Logic (Matching Bed Cards) ---
  const getHeaderStyle = () => {
    if (isLogMode) return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200';
    if (targetBedId === 11) return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'; // Traction/Indigo
    if (targetBedId >= 7) return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300';
    if (targetBedId >= 3) return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300';
    return 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300';
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full sm:w-[500px] max-h-[90vh] sm:max-h-[95vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Styled like Bed Card */}
        <div className={`p-4 sm:p-5 flex justify-between items-center shrink-0 transition-colors ${getHeaderStyle()}`}>
          <div className="flex items-center gap-3">
            {previewPreset && (
              <button 
                onClick={() => setPreviewPreset(null)}
                className="p-1 -ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold opacity-70 uppercase tracking-wider leading-none mb-0.5">
                {previewPreset ? '설정 확인' : (isLogMode ? '처방 수정' : '치료 시작')}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black leading-none tracking-tight">
                {isLogMode ? 'Log Edit' : (isTractionBed ? 'Traction' : `BED ${targetBedId}`)}
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
                {/* Control Buttons */}
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
                presets={presets} 
                onSelect={(p) => setPreviewPreset(JSON.parse(JSON.stringify(p)))} 
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
                onQuickStart={handleQuickItemClick} 
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
