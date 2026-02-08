import React, { useState } from 'react';
import { Save, Clock } from 'lucide-react';
import { QuickTreatment } from '../../types';
import { ColorPicker } from '../common/ColorPicker';

interface QuickTreatmentEditorProps {
  initialItem: QuickTreatment;
  onSave: (item: QuickTreatment) => void;
  onCancel: () => void;
}

export const QuickTreatmentEditor: React.FC<QuickTreatmentEditorProps> = ({ initialItem, onSave, onCancel }) => {
  const [item, setItem] = useState<QuickTreatment>(initialItem);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-right-2 overflow-hidden">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {initialItem.id.startsWith('new-') ? '새 치료 항목 추가' : '치료 항목 수정'}
        </h3>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-5">
            <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">치료 전체 명칭 (Full Name)</label>
            <input 
                type="text" 
                value={item.name}
                onChange={(e) => setItem({...item, name: e.target.value})}
                className="w-full p-3 border rounded-xl bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-white dark:border-slate-600 font-bold focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="예: 핫팩 (Hot Pack)"
            />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">약어/라벨 (Label)</label>
                <input 
                    type="text" 
                    value={item.label}
                    maxLength={4}
                    onChange={(e) => setItem({...item, label: e.target.value})}
                    className="w-full p-3 border rounded-xl bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-white dark:border-slate-600 font-bold focus:ring-2 focus:ring-brand-500 outline-none text-center"
                    placeholder="예: HP"
                />
                <p className="text-[9px] text-gray-400 mt-1">* 3~4글자 권장</p>
                </div>
                
                <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">기본 시간 (분)</label>
                <input 
                    type="number" 
                    value={item.duration}
                    onChange={(e) => setItem({...item, duration: parseInt(e.target.value) || 0})}
                    className="w-full p-3 border rounded-xl bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-white dark:border-slate-600 font-bold focus:ring-2 focus:ring-brand-500 outline-none text-center"
                />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">색상 태그</label>
                    <ColorPicker 
                      value={item.color} 
                      onChange={(color) => setItem({...item, color})} 
                      className="w-full"
                    />
                </div>

                <div className="flex flex-col justify-end">
                    <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all h-[46px] ${item.enableTimer ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/20 dark:border-brand-800 dark:text-brand-300' : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-slate-700 dark:border-slate-600'}`}>
                        <input 
                            type="checkbox" 
                            checked={item.enableTimer} 
                            onChange={(e) => setItem({...item, enableTimer: e.target.checked})}
                            className="hidden" 
                        />
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-bold">타이머 사용</span>
                    </label>
                </div>
            </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 shrink-0">
        <button onClick={() => onSave(item)} className="flex-1 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 flex justify-center items-center shadow-lg shadow-brand-200 dark:shadow-none font-bold text-sm transition-transform active:scale-98">
          <Save className="w-4 h-4 mr-2" /> 저장하기
        </button>
        <button onClick={onCancel} className="flex-1 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm font-bold text-sm transition-transform active:scale-98 border border-gray-200 dark:border-slate-600">
          취소
        </button>
      </div>
    </div>
  );
};