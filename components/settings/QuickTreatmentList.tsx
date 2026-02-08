import React, { useState } from 'react';
import { Plus, Trash2, Edit3, ArrowUpDown, X, Check } from 'lucide-react';
import { QuickTreatment } from '../../types';

interface QuickTreatmentListProps {
  items: QuickTreatment[];
  onEdit: (item: QuickTreatment) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onUpdateItems: (items: QuickTreatment[]) => void;
}

export const QuickTreatmentList: React.FC<QuickTreatmentListProps> = ({ 
  items, 
  onEdit, 
  onDelete, 
  onCreate, 
  onUpdateItems 
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newItems.length) {
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      onUpdateItems(newItems);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-2">
      <div className="flex justify-between items-end mb-4 px-1 shrink-0">
        <div>
          <h3 className="text-xl font-black dark:text-white leading-none">단일 치료 목록</h3>
          <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Manage Single Treatments</p>
        </div>
        <button 
          onClick={onCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/20 font-black text-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          항목 추가
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pb-24 sm:pb-4 pr-1 custom-scrollbar">
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:border-brand-300 dark:hover:border-slate-500 transition-all group">
             {/* Order Control */}
             <div className="flex flex-col items-center gap-1 shrink-0">
               <button onClick={() => handleMove(idx, 'up')} disabled={idx === 0} className="text-gray-300 hover:text-brand-600 disabled:opacity-0 active:scale-75 transition-all"><ArrowUpDown className="w-3 h-3 rotate-180" /></button>
               <span className="text-[10px] font-black text-gray-400">{idx + 1}</span>
               <button onClick={() => handleMove(idx, 'down')} disabled={idx === items.length - 1} className="text-gray-300 hover:text-brand-600 disabled:opacity-0 active:scale-75 transition-all"><ArrowUpDown className="w-3 h-3" /></button>
             </div>

             {/* Content */}
             <div className="flex-1 min-w-0 flex items-center gap-3">
               <div className={`w-10 h-10 rounded-xl ${item.color} text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0`}>
                 {item.label}
               </div>
               <div className="min-w-0">
                 <h4 className="font-bold text-slate-800 dark:text-white truncate">{item.name}</h4>
                 <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-bold">
                       {item.duration}분
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${item.enableTimer ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-400 dark:bg-slate-700'}`}>
                       {item.enableTimer ? '타이머 ON' : '타이머 OFF'}
                    </span>
                 </div>
               </div>
             </div>

             {/* Actions */}
             <div className="flex gap-1.5 shrink-0">
               {deleteConfirmId === item.id ? (
                  <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                    <button onClick={() => onDelete(item.id)} className="px-3 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-red-500/20 flex items-center">
                      <Check className="w-3.5 h-3.5 mr-1" /> 삭제
                    </button>
                    <button onClick={() => setDeleteConfirmId(null)} className="p-2 bg-gray-100 dark:bg-slate-700 text-gray-500 rounded-xl">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
               ) : (
                  <>
                    <button onClick={() => onEdit(item)} className="p-2.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-xl transition-all active:scale-90">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirmId(item.id)} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all active:scale-90">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
               )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};