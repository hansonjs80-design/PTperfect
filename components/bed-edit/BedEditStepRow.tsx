
import React from 'react';
import { ChevronUp, ChevronDown, X, Minus, Plus, Clock, RefreshCw } from 'lucide-react';
import { TreatmentStep } from '../../types';
import { ColorPicker } from '../common/ColorPicker';

interface BedEditStepRowProps {
  step: TreatmentStep;
  index: number;
  isActive: boolean;
  totalSteps: number;
  onMove: (idx: number, direction: 'up' | 'down') => void;
  onRemove: (idx: number) => void;
  onChange: (idx: number, updates: Partial<TreatmentStep>) => void;
  onDurationChange: (idx: number, changeMinutes: number) => void;
  onApplyDuration?: (duration: number) => void;
}

export const BedEditStepRow: React.FC<BedEditStepRowProps> = ({
  step,
  index,
  isActive,
  totalSteps,
  onMove,
  onRemove,
  onChange,
  onDurationChange,
  onApplyDuration
}) => {
  const minutes = Math.floor(step.duration / 60);

  const handleMinuteInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      const newDuration = val * 60;
      onChange(index, { duration: newDuration });
    }
  };

  return (
    <div className={`group flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border transition-all ${
      isActive 
        ? 'border-brand-300 dark:border-brand-700 ring-1 ring-brand-100 dark:ring-brand-900/50' 
        : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'
    }`}>
      {/* Top Row: Reordering & Name */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-50 dark:border-slate-700/50">
        <div className="flex flex-col gap-0.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors">
           <button onClick={() => onMove(index, 'up')} disabled={index === 0} className="hover:text-brand-500 disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5" /></button>
           <button onClick={() => onMove(index, 'down')} disabled={index === totalSteps - 1} className="hover:text-brand-500 disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5" /></button>
        </div>

        <div className={`w-1.5 h-8 rounded-full ${step.color} shadow-sm shrink-0`} />
        
        <input 
          type="text" 
          value={step.name}
          onChange={(e) => onChange(index, { name: e.target.value })}
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-b focus:border-brand-500 transition-colors placeholder:text-slate-300"
          placeholder="치료명 입력"
        />

        <button 
          onClick={() => onRemove(index)} 
          className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Row: Controls */}
      <div className="flex items-center justify-between p-2 pl-3 bg-gray-50/50 dark:bg-slate-900/30 rounded-b-2xl">
         {/* Duration Control */}
         <div className="flex items-center bg-white dark:bg-slate-700 rounded-lg p-0.5 shadow-sm border border-gray-100 dark:border-slate-600">
            <button onClick={() => onDurationChange(index, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-600 rounded-md text-slate-400 active:scale-90"><Minus className="w-3 h-3" strokeWidth={3} /></button>
            <div className="flex items-baseline px-1.5 min-w-[32px] justify-center">
               <input 
                 type="number" 
                 value={minutes} 
                 onChange={handleMinuteInput}
                 className="w-5 text-right bg-transparent text-xs font-black text-slate-700 dark:text-slate-200 outline-none p-0 appearance-none"
               />
               <span className="text-[9px] font-bold text-slate-400 ml-0.5">m</span>
            </div>
            <button onClick={() => onDurationChange(index, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-600 rounded-md text-slate-400 active:scale-90"><Plus className="w-3 h-3" strokeWidth={3} /></button>
         </div>

         <div className="flex items-center gap-2">
            {/* Timer Toggle */}
            <button
                onClick={() => onChange(index, { enableTimer: !step.enableTimer })}
                className={`p-1.5 rounded-lg transition-all ${
                  step.enableTimer 
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 shadow-sm' 
                    : 'bg-transparent text-slate-300 hover:text-slate-500'
                }`}
                title={step.enableTimer ? "타이머 켜짐" : "타이머 꺼짐"}
            >
                <Clock className="w-3.5 h-3.5" />
            </button>

            {/* Color Picker */}
            <div className="w-[80px]">
                <ColorPicker 
                   value={step.color}
                   onChange={(color) => onChange(index, { color })}
                />
            </div>

            {/* Apply Button (Only for active step) */}
            {onApplyDuration && step.enableTimer && (
              <button 
                onClick={() => onApplyDuration(step.duration)}
                className="p-1.5 bg-brand-600 text-white rounded-lg shadow-md hover:bg-brand-700 active:scale-95 transition-all ml-1 animate-pulse"
                title="현재 시간에 적용"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
         </div>
      </div>
    </div>
  );
};
