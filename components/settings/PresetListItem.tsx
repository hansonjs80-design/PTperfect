import React from 'react';
import { ChevronUp, ChevronDown, Check, X, Trash2, Edit3 } from 'lucide-react';
import { Preset } from '../../types';
import { getAbbreviation } from '../../utils/bedUtils';

interface PresetListItemProps {
  preset: Preset;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isSearchActive: boolean;
  deleteConfirmId: string | null;
  onEdit: (preset: Preset) => void;
  onDeleteClick: (id: string) => void;
  onCancelDelete: () => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}

export const PresetListItem: React.FC<PresetListItemProps> = ({
  preset,
  index,
  isFirst,
  isLast,
  isSearchActive,
  deleteConfirmId,
  onEdit,
  onDeleteClick,
  onCancelDelete,
  onMove
}) => {
  const calculateTotalMinutes = (p: Preset) => {
    const totalSeconds = p.steps.reduce((sum, step) => sum + step.duration, 0);
    return Math.floor(totalSeconds / 60);
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:border-brand-300 dark:hover:border-slate-500 transition-all group animate-in slide-in-from-bottom-1">
      {/* 1. 순서 및 번호 조정 영역 */}
      <div className="flex flex-col items-center shrink-0 w-6">
        {!isSearchActive && (
          <button 
            onClick={() => onMove(preset.id, 'up')}
            disabled={isFirst}
            className="p-0.5 text-gray-300 hover:text-brand-600 disabled:opacity-0 transition-all active:scale-75"
          >
            <ChevronUp className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
        )}
        <div className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-lg text-[10px] font-black border transition-colors ${
          isSearchActive ? 'bg-gray-100 dark:bg-slate-900 text-gray-400 border-gray-200 dark:border-slate-700' : 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border-brand-100 dark:border-brand-800'
        }`}>
          {index + 1}
        </div>
        {!isSearchActive && (
          <button 
            onClick={() => onMove(preset.id, 'down')}
            disabled={isLast}
            className="p-0.5 text-gray-300 hover:text-brand-600 disabled:opacity-0 transition-all active:scale-75"
          >
            <ChevronDown className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
        )}
      </div>

      {/* 2. 처방 정보 및 포함 치료 요약 영역 */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            
            {/* Row 1 (Mobile): Name & Metadata - Justified between */}
            <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0 w-full sm:w-auto">
                <span className="font-black text-slate-800 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate text-sm sm:text-base">
                  {preset.name}
                </span>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 rounded font-black uppercase tracking-tighter">
                    {preset.steps.length} STEPS
                  </span>
                  <span className="text-[9px] font-black text-gray-400 dark:text-gray-500">
                    {calculateTotalMinutes(preset)}분
                  </span>
                </div>
            </div>
            
            {/* Row 2 (Mobile): Steps List */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 min-w-0 sm:ml-auto">
              {preset.steps.map((step, sIdx) => (
                <React.Fragment key={sIdx}>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${step.color} shadow-sm`} />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                      {getAbbreviation(step.name)}
                    </span>
                  </div>
                  {sIdx < preset.steps.length - 1 && (
                    <span className="text-[8px] text-gray-300 dark:text-gray-600 font-bold">/</span>
                  )}
                </React.Fragment>
              ))}
              {preset.steps.length === 0 && (
                <span className="text-[10px] text-gray-300 italic font-bold">비어있음</span>
              )}
            </div>

        </div>
      </div>

      {/* 3. 액션 버튼 영역 */}
      <div className="flex gap-1 shrink-0 self-center">
        {deleteConfirmId === preset.id ? (
          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
            <button 
              onClick={() => onDeleteClick(preset.id)} 
              className="px-2 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black shadow-lg shadow-red-500/20 flex items-center"
            >
              <Check className="w-3 h-3 mr-0.5" /> 확정
            </button>
            <button 
              onClick={onCancelDelete} 
              className="p-1.5 bg-gray-100 dark:bg-slate-700 text-gray-500 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <button 
              onClick={() => onEdit(preset)} 
              className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-xl transition-all active:scale-90"
              title="수정"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onDeleteClick(preset.id)} 
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all active:scale-90"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};