
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
    <div className={`flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 border-b border-white/10 shrink-0 transition-colors ${getHeaderStyle()}`}>
       <div className="flex items-center gap-3">
         {/* Single Row Layout: Circle Badge + Title */}
         
         {/* Circle Badge (Solid White Background) */}
         <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0 ring-2 ring-white/30 dark:ring-slate-700/30">
            <span className="text-xl font-black leading-none text-current opacity-90 pb-0.5">
                {bedId === 11 ? 'T' : bedId}
            </span>
         </div>

         {/* Title Text */}
         <h3 className="text-xl sm:text-2xl font-black leading-none tracking-tight opacity-90">
            설정 및 수정
         </h3>
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
