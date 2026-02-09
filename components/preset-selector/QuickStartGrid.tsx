
import React from 'react';
import { Zap, Layers, Play } from 'lucide-react';
import { QuickTreatment } from '../../types';
import { useTreatmentContext } from '../../contexts/TreatmentContext';

interface QuickStartGridProps {
  onQuickItemClick: (template: QuickTreatment) => void;
  selectedItems?: QuickTreatment[];
  isMultiSelect?: boolean;
  onToggleMultiSelect?: () => void;
  onStartSelected?: () => void;
}

export const QuickStartGrid: React.FC<QuickStartGridProps> = ({ 
  onQuickItemClick,
  selectedItems = [],
  isMultiSelect = false,
  onToggleMultiSelect,
  onStartSelected
}) => {
  const { quickTreatments } = useTreatmentContext();

  return (
    <div className="space-y-3 relative">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          단일 치료 (Quick Start)
        </h4>
        
        {/* Multi Select Toggle */}
        <button 
          onClick={onToggleMultiSelect}
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border
            ${isMultiSelect 
              ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/30' 
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }
          `}
        >
          <Layers className="w-3 h-3" />
          {isMultiSelect ? '다중 선택 ON' : '다중 선택 OFF'}
        </button>
      </div>
      
      <div className="grid grid-cols-5 md:grid-cols-6 gap-2 pb-16 sm:pb-0">
        {quickTreatments.map((item) => {
          const isSelected = selectedItems.some(s => s.id === item.id);
          const selectionIndex = selectedItems.findIndex(s => s.id === item.id) + 1;

          return (
            <button
              key={item.id}
              onClick={() => onQuickItemClick(item)}
              className={`
                group flex flex-col items-center justify-center p-1.5 h-16 rounded-2xl shadow-sm border transition-all active:scale-95 relative
                ${isSelected 
                  ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 ring-1 ring-brand-500 z-10' 
                  : 'bg-white dark:bg-slate-800 border-transparent hover:border-brand-300 dark:hover:border-slate-600 hover:shadow-md'
                }
              `}
            >
              {/* Selection Badge */}
              {isMultiSelect && isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-sm z-20 animate-in zoom-in duration-200">
                  {selectionIndex}
                </div>
              )}

              {/* Layout Change: Dot + Name on top row */}
              <div className="flex items-center gap-1.5 mb-1 w-full justify-center">
                <div className={`w-2 h-2 rounded-full ${item.color} shadow-sm group-hover:scale-125 transition-transform shrink-0`} />
                <span className={`text-[11px] font-black leading-none truncate max-w-[80%] transition-colors ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400'}`}>
                  {item.label}
                </span>
              </div>
              
              {/* Duration below */}
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400">
                {item.duration}분
              </span>
            </button>
          );
        })}
      </div>

      {/* Floating Start Button for Multi-Select */}
      {isMultiSelect && selectedItems.length > 0 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 animate-in slide-in-from-bottom-4 duration-300 pointer-events-none">
           <button 
             onClick={onStartSelected}
             className="pointer-events-auto flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-full font-black text-sm shadow-xl shadow-brand-500/40 hover:-translate-y-1 transition-all active:translate-y-0 active:scale-95"
           >
             <Play className="w-4 h-4 fill-current" />
             선택한 {selectedItems.length}개 치료 시작
           </button>
        </div>
      )}
    </div>
  );
};
