
import React, { useState, useMemo } from 'react';
import { Plus, Check, X, ArrowUpDown, Search, Filter, Trash2, Edit3 } from 'lucide-react';
import { Preset } from '../../types';
import { PresetListItem } from './PresetListItem';

interface PresetListProps {
  presets: Preset[];
  onEdit: (preset: Preset) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onUpdatePresets: (presets: Preset[]) => void;
}

export const PresetList: React.FC<PresetListProps> = ({ 
  presets, 
  onEdit, 
  onDelete, 
  onCreate,
  onUpdatePresets 
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');

  // 필터링 및 정렬 로직 (메모이제이션으로 성능 최적화)
  const processedPresets = useMemo(() => {
    let result = [...presets.map((p, index) => ({ ...p, originalIndex: index }))];

    // 1. 검색어 필터링
    if (searchQuery.trim()) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 2. 단계수 기준 정렬
    if (sortOrder === 'asc') {
      result.sort((a, b) => a.steps.length - b.steps.length);
    } else if (sortOrder === 'desc') {
      result.sort((a, b) => b.steps.length - a.steps.length);
    }

    return result;
  }, [presets, searchQuery, sortOrder]);

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const index = presets.findIndex(p => p.id === id);
    if (index < 0) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= presets.length) return;

    const newPresets = [...presets];
    [newPresets[index], newPresets[newIndex]] = [newPresets[newIndex], newPresets[index]];
    onUpdatePresets(newPresets);
  };

  const toggleSort = () => {
    setSortOrder(prev => {
      if (prev === 'none') return 'desc';
      if (prev === 'desc') return 'asc';
      return 'none';
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-200 flex flex-col h-full overflow-hidden">
      {/* 상단 헤더 및 추가 버튼 */}
      <div className="flex justify-between items-end mb-4 px-1 shrink-0">
        <div>
          <h3 className="text-xl font-black dark:text-white leading-none">처방 목록 관리</h3>
          <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Manage Treatment Presets</p>
        </div>
        <button 
          onClick={onCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/20 font-black text-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          신규 처방
        </button>
      </div>

      {/* 필터 및 정렬 바 */}
      <div className="flex flex-col gap-2 mb-4 shrink-0 px-1">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
          <input 
            type="text"
            placeholder="처방 명칭으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 dark:bg-slate-900 border-2 border-transparent focus:border-brand-500/30 rounded-xl text-sm font-bold focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder:text-gray-400 dark:text-white"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>
        
        <button 
          onClick={toggleSort}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black transition-all border-2 ${
            sortOrder !== 'none' 
              ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/20 dark:border-brand-800 dark:text-brand-400' 
              : 'bg-white border-gray-100 text-gray-500 dark:bg-slate-800 dark:border-slate-700 hover:border-gray-200'
          }`}
        >
          <ArrowUpDown className={`w-3.5 h-3.5 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
          {sortOrder === 'desc' ? '단계 많은 순 (3→1)' : sortOrder === 'asc' ? '단계 적은 순 (1→3)' : '단계별 정렬하기'}
        </button>
      </div>

      {/* 리스트 본문 */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pb-24 sm:pb-4 pr-1 custom-scrollbar">
        {processedPresets.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-4 opacity-40 grayscale">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <Filter className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-500">일치하는 처방이 없습니다.</p>
          </div>
        ) : (
          processedPresets.map((preset) => (
            <PresetListItem 
              key={preset.id}
              preset={preset}
              index={preset.originalIndex}
              isFirst={preset.originalIndex === 0}
              isLast={preset.originalIndex === presets.length - 1}
              isSearchActive={!!searchQuery || sortOrder !== 'none'}
              deleteConfirmId={deleteConfirmId}
              onEdit={onEdit}
              onDeleteClick={(id) => {
                if (deleteConfirmId === id) {
                  onDelete(id);
                  setDeleteConfirmId(null);
                } else {
                  setDeleteConfirmId(id);
                  setTimeout(() => setDeleteConfirmId(prev => prev === id ? null : prev), 3000);
                }
              }}
              onCancelDelete={() => setDeleteConfirmId(null)}
              onMove={handleMove}
            />
          ))
        )}
      </div>
    </div>
  );
};
