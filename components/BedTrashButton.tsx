
import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';

interface BedTrashButtonProps {
  trashState: 'idle' | 'confirm' | 'deleting';
  onClick: (e: React.MouseEvent) => void;
}

export const BedTrashButton: React.FC<BedTrashButtonProps> = ({ trashState, onClick }) => {
  return (
    <button 
      onClick={onClick}
      disabled={trashState === 'deleting'}
      className={`p-1 sm:p-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 active:scale-90 ${
        trashState === 'idle' ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:text-slate-500 dark:hover:bg-red-900/30' :
        trashState === 'confirm' ? 'bg-red-500 text-white px-2 py-0.5 sm:px-2 sm:py-1 shadow-md ring-2 ring-red-200 dark:ring-red-900' :
        'bg-slate-100 text-slate-400 px-2 sm:px-3'
      }`}
    >
      {trashState === 'idle' && <Trash2 className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" />}
      {trashState === 'confirm' && <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">삭제</span>}
      {trashState === 'deleting' && <Loader2 className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] animate-spin" />}
    </button>
  );
};
