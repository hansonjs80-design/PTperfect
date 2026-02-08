
import React, { useState, useMemo } from 'react';
import { Play, ArrowUpDown, Filter, Search } from 'lucide-react';
import { Preset } from '../../types';
import { getAbbreviation } from '../../utils/bedUtils';

interface PresetListViewProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
}

export const PresetListView: React.FC<PresetListViewProps> = ({ presets, onSelect }) => {
  const [filterStep, setFilterStep] = useState<'all' | number>('all');
  const [sortDir, setSortDir] = useState<'none' | 'asc' | 'desc'>('none');

  const processedPresets = useMemo(() => {
    let result = [...presets];
    if (filterStep !== 'all') {
      result = result.filter(p => p.steps.length === filterStep);
    }
    if (sortDir !== 'none') {
      result.sort((a, b) => {
        const diff = a.steps.length - b.steps.length;
        return sortDir === 'asc' ? diff : -diff;
      });
    }
    return result;
  }, [presets, filterStep, sortDir]);

  const toggleSort = () => setSortDir(prev => {
    if (prev === 'none') return 'desc';
    if (prev === 'desc') return 'asc';
    return 'none';
  });

  return (
    <div className="space-y-3">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          세트 처방 선택
        </h4>

        <div className="flex items-center gap-2">
          {/* Step Filter Pills */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            {[
              { label: 'ALL', val: 'all' },
              { label: '2단계', val: 2 },
              { label: '3단계', val: 3 }
            ].map((opt) => (
              <button 
                key={String(opt.val)}
                onClick={() => setFilterStep(opt.val as any)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                  filterStep === opt.val 
                    ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-400 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort Button */}
          <button 
            onClick={toggleSort}
            className={`p-1.5 rounded-lg transition-colors flex items-center justify-center w-7 h-7 ${
              sortDir !== 'none' 
                ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' 
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preset List - Card Style */}
      <div className="flex flex-col gap-2">
        {processedPresets.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-8 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
             <Search className="w-8 h-8 text-slate-300 mb-2" />
             <span className="text-xs font-bold text-slate-400">일치하는 처방이 없습니다.</span>
           </div>
        ) : (
          processedPresets.map(preset => {
            const totalMins = Math.floor(preset.steps.reduce((acc, s) => acc + s.duration, 0) / 60);
            return (
              <button
                key={preset.id}
                onClick={() => onSelect(preset)}
                className="group relative w-full p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-transparent hover:border-brand-300 dark:hover:border-slate-600 hover:shadow-md transition-all active:scale-[0.98] text-left flex items-center justify-between"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1.5">
                     <span className="font-black text-slate-800 dark:text-white text-base leading-none">
                       {preset.name}
                     </span>
                     <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md">
                       {totalMins}분
                     </span>
                  </div>
                  
                  {/* Step Pills */}
                  <div className="flex flex-wrap items-center gap-1">
                    {preset.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center">
                        <span 
                          className={`
                            text-[10px] px-2 py-0.5 rounded-full font-bold text-white shadow-sm
                            ${step.color.replace('bg-', 'bg-')} 
                            opacity-90 group-hover:opacity-100 transition-opacity
                          `}
                        >
                          {getAbbreviation(step.name)}
                        </span>
                        {idx < preset.steps.length - 1 && (
                          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-slate-700 text-brand-600 dark:text-slate-400 flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white transition-colors shadow-inner group-hover:shadow-lg group-hover:shadow-brand-500/30">
                   <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
