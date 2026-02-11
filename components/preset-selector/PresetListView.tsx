
import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Preset } from '../../types';
import { getStepLabel } from '../../utils/bedUtils';
import { PresetInlineDetail } from './PresetInlineDetail';

interface PresetListViewProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void; // Used for "Start" action now
}

export const PresetListView: React.FC<PresetListViewProps> = ({ presets, onSelect }) => {
  const [filterStep, setFilterStep] = useState<'all' | number>('all');
  const [sortDir, setSortDir] = useState<'none' | 'asc' | 'desc'>('none');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const handleToggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-2">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-1 mb-1">
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
            const isExpanded = expandedId === preset.id;

            return (
              <div
                key={preset.id}
                className={`w-full px-3 py-2.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border transition-all ${
                  isExpanded 
                    ? 'border-brand-500 ring-1 ring-brand-500/20 shadow-md' 
                    : 'border-transparent hover:border-brand-300 dark:hover:border-slate-600'
                }`}
                onClick={() => handleToggleExpand(preset.id)}
              >
                <div className="flex items-center justify-between cursor-pointer">
                  
                  {/* Left Group: Name & Steps (Single Row Layout) */}
                  <div className="flex flex-row items-center gap-2 flex-1 min-w-0 pr-1">
                    {/* Name */}
                    <span className={`font-black text-sm sm:text-base leading-none transition-colors truncate shrink-0 max-w-[100px] xs:max-w-[130px] sm:max-w-none ${isExpanded ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-white'}`}>
                      {preset.name}
                    </span>
                    
                    {/* Divider */}
                    <span className="text-slate-300 dark:text-slate-600 shrink-0 text-[10px]">|</span>

                    {/* Step Pills - Horizontal Flow */}
                    <div className="flex flex-wrap items-center gap-1 overflow-hidden h-[18px] sm:h-auto">
                      {preset.steps.map((step, idx) => (
                        <div key={idx} className="flex items-center shrink-0">
                          <span 
                            className={`
                              text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-bold text-white shadow-sm
                              ${step.color} opacity-90 leading-none
                            `}
                          >
                            {getStepLabel(step)}
                          </span>
                          {idx < preset.steps.length - 1 && (
                            <span className="text-[10px] text-slate-300 dark:text-slate-600 mx-0.5">+</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Group: Time & Chevron */}
                  <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-slate-100 dark:border-slate-700 ml-1">
                    {/* Time Display */}
                    <span className="text-sm sm:text-lg font-black text-slate-600 dark:text-slate-300 tabular-nums">
                      {totalMins}<span className="text-[10px] sm:text-xs font-bold ml-0.5">분</span>
                    </span>

                    <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors ${
                      isExpanded 
                        ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400' 
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                    }`}>
                       {isExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </div>
                  </div>
                </div>

                {/* Inline Details (Expanded) */}
                {isExpanded && (
                  <PresetInlineDetail 
                    initialPreset={preset} 
                    onStart={(updatedPreset) => onSelect(updatedPreset)} 
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
