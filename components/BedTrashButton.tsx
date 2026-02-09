
import React from 'react';
import { Trash2, Loader2, Check } from 'lucide-react';

interface BedTrashButtonProps {
  trashState: 'idle' | 'confirm' | 'deleting';
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

export const BedTrashButton: React.FC<BedTrashButtonProps> = ({ trashState, onClick, className }) => {
  return (
    <button 
      onClick={onClick}
      disabled={trashState === 'deleting'}
      className={`
        rounded-lg transition-all duration-200 flex items-center justify-center gap-1 active:scale-95 shadow-sm
        ${trashState === 'idle' 
          ? 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 hover:text-red-600 hover:bg-red-50' 
          : ''}
        ${trashState === 'confirm' 
          ? 'bg-red-500 text-white' 
          : ''}
        ${trashState === 'deleting' 
          ? 'bg-slate-100 text-slate-400 dark:bg-slate-700' 
          : ''}
        ${className}
      `}
      title={trashState === 'idle' ? "삭제" : "삭제 확정"}
    >
      {trashState === 'idle' && <Trash2 className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" />}
      {trashState === 'confirm' && (
        <>
          <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">삭제</span>
        </>
      )}
      {trashState === 'deleting' && <Loader2 className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] animate-spin" />}
    </button>
  );
};
