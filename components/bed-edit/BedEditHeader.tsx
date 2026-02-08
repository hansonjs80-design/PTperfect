
import React from 'react';
import { Settings, X } from 'lucide-react';

interface BedEditHeaderProps {
  bedId: number;
  onClose: () => void;
}

export const BedEditHeader: React.FC<BedEditHeaderProps> = ({ bedId, onClose }) => {
  // Dynamic Header Style Logic (Matching Bed Cards)
  const getHeaderStyle = () => {
    if (bedId === 11) return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300';
    if (bedId >= 7) return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300';
    if (bedId >= 3) return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300';
    return 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300';
  };

  return (
    <div className={`flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0 transition-colors ${getHeaderStyle()}`}>
       <div className="flex items-center gap-3">
         <div className="p-2 bg-white/60 dark:bg-black/20 rounded-xl shadow-sm backdrop-blur-sm">
            <Settings className="w-5 h-5" />
         </div>
         <div className="flex flex-col">
            <span className="text-[10px] font-bold opacity-70 uppercase tracking-wider leading-none mb-0.5">
              설정 및 수정
            </span>
            <h3 className="text-2xl font-black leading-none tracking-tight">
              {bedId === 11 ? 'Traction' : `BED ${bedId}`}
            </h3>
         </div>
       </div>
       <button 
         onClick={onClose}
         className="p-2 bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 rounded-full transition-colors backdrop-blur-sm"
       >
         <X className="w-5 h-5" />
       </button>
    </div>
  );
};
