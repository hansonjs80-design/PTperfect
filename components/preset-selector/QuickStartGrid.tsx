
import React from 'react';
import { Plus, Zap } from 'lucide-react';
import { QuickTreatment } from '../../types';
import { useTreatmentContext } from '../../contexts/TreatmentContext';

interface QuickStartGridProps {
  onQuickStart: (template: QuickTreatment) => void;
}

export const QuickStartGrid: React.FC<QuickStartGridProps> = ({ onQuickStart }) => {
  const { quickTreatments } = useTreatmentContext();

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
        <Zap className="w-3.5 h-3.5" />
        단일 치료 (Quick Start)
      </h4>
      
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {quickTreatments.map((item) => (
          <button
            key={item.id}
            onClick={() => onQuickStart(item)}
            className="group flex flex-col items-center justify-center p-1.5 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-transparent hover:border-brand-300 dark:hover:border-slate-600 hover:shadow-md transition-all active:scale-95"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${item.color} mb-1.5 shadow-sm group-hover:scale-125 transition-transform`} />
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 leading-none mb-0.5 text-center w-full truncate px-1">
              {item.label}
            </span>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400">
              {item.duration}m
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
