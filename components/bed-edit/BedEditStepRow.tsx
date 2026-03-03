
import React from 'react';
import { ChevronUp, ChevronDown, X, Minus, Plus, Clock, RefreshCw } from 'lucide-react';
import { TreatmentStep } from '../../types';

interface BedEditStepRowProps {
  step: TreatmentStep;
  index: number;
  isActive: boolean;
  totalSteps: number;
  onMove: (idx: number, direction: 'up' | 'down') => void;
  onRemove: (idx: number) => void;
  onChange: (idx: number, updates: Partial<TreatmentStep>) => void;
  onDurationChange: (idx: number, changeSeconds: number) => void;
  onApplyDuration?: (duration: number) => void;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

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
  const duration = Math.max(30, step?.duration || 0);
  const color = step?.color || 'bg-gray-500';
  const name = step?.name || '';

  return (
    <div className={`group flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border transition-all overflow-hidden ${
      isActive
        ? 'border-brand-300 dark:border-brand-700 ring-1 ring-brand-100 dark:ring-brand-900/50'
        : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'
    }`}>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-col gap-0.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors">
          <button onClick={() => onMove(index, 'up')} disabled={index === 0} className="hover:text-brand-500 disabled:opacity-20 active:scale-90"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button onClick={() => onMove(index, 'down')} disabled={index === totalSteps - 1} className="hover:text-brand-500 disabled:opacity-20 active:scale-90"><ChevronDown className="w-3.5 h-3.5" /></button>
        </div>
        <div className={`w-1.5 h-8 rounded-full ${color} shadow-sm`} />
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => onChange(index, { name: e.target.value })}
        className="flex-1 min-w-[60px] bg-transparent text-sm font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-b focus:border-brand-500 transition-colors placeholder:text-slate-300 truncate"
        placeholder="치료명"
      />

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center bg-gray-50 dark:bg-slate-700 rounded-lg p-0.5 shadow-sm border border-gray-100 dark:border-slate-600">
          <button onClick={() => onDurationChange(index, -30)} className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 rounded-md text-slate-400 dark:text-slate-300 active:scale-90 transition-colors"><Minus className="w-3 h-3" strokeWidth={3} /></button>
          <div className="px-1 min-w-[38px] text-center">
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 tabular-nums">{formatDuration(duration)}</span>
          </div>
          <button onClick={() => onDurationChange(index, 30)} className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 rounded-md text-slate-400 dark:text-slate-300 active:scale-90 transition-colors"><Plus className="w-3 h-3" strokeWidth={3} /></button>
        </div>

        <button
          onClick={() => onChange(index, { enableTimer: !step?.enableTimer })}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
            step?.enableTimer
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
              : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          title={step?.enableTimer ? "타이머 켜짐" : "타이머 꺼짐"}
        >
          <Clock className="w-3.5 h-3.5" />
        </button>

        {onApplyDuration && step?.enableTimer && (
          <button
            onClick={() => onApplyDuration(step.duration)}
            className="w-7 h-7 flex items-center justify-center bg-brand-600 text-white rounded-lg shadow-md hover:bg-brand-700 active:scale-95 transition-all animate-pulse"
            title="현재 시간에 적용"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() => onRemove(index)}
          className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors active:scale-95"
          title="삭제"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
