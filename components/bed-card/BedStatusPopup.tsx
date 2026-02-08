
import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { BedState } from '../../types';
import { BedEditFlags } from '../bed-edit/BedEditFlags';

interface BedStatusPopupProps {
  bed: BedState;
  onClose: () => void;
  onToggleInjection: (id: number) => void;
  onToggleFluid: (id: number) => void;
  onToggleTraction: (id: number) => void;
  onToggleESWT: (id: number) => void;
  onToggleManual: (id: number) => void;
}

export const BedStatusPopup: React.FC<BedStatusPopupProps> = ({
  bed, 
  onClose, 
  onToggleInjection, 
  onToggleFluid, 
  onToggleTraction, 
  onToggleESWT, 
  onToggleManual
}) => {
  return createPortal(
    <div 
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-[340px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">상태 표시 변경</h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4 bg-white dark:bg-slate-900">
           {/* Reuse existing flags component but in a simplified modal context */}
           <BedEditFlags
             bed={bed}
             onToggleInjection={onToggleInjection}
             onToggleFluid={onToggleFluid}
             onToggleManual={onToggleManual}
             onToggleESWT={onToggleESWT}
             onToggleTraction={onToggleTraction}
           />
        </div>
        
        <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-end">
           <button 
             onClick={onClose}
             className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
           >
             완료
           </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
