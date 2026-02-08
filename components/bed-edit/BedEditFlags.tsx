
import React from 'react';
import { Syringe, Hand, Zap, ArrowUpFromLine, Droplet } from 'lucide-react';
import { BedState } from '../../types';

interface BedEditFlagsProps {
  bed: BedState;
  onToggleInjection?: (bedId: number) => void;
  onToggleFluid?: (bedId: number) => void;
  onToggleManual?: (bedId: number) => void;
  onToggleESWT?: (bedId: number) => void;
  onToggleTraction?: (bedId: number) => void;
}

export const BedEditFlags: React.FC<BedEditFlagsProps> = ({ 
  bed, 
  onToggleInjection, 
  onToggleFluid,
  onToggleManual, 
  onToggleESWT, 
  onToggleTraction 
}) => {
  const toggles = [
    { key: 'isInjection', label: '주사', icon: Syringe, activeClass: 'bg-red-500 text-white shadow-red-200 border-transparent', onClick: onToggleInjection },
    { key: 'isFluid', label: '수액', icon: Droplet, activeClass: 'bg-cyan-500 text-white shadow-cyan-200 border-transparent', onClick: onToggleFluid },
    { key: 'isManual', label: '도수', icon: Hand, activeClass: 'bg-violet-500 text-white shadow-violet-200 border-transparent', onClick: onToggleManual },
    { key: 'isESWT', label: '충격파', icon: Zap, activeClass: 'bg-blue-500 text-white shadow-blue-200 border-transparent', onClick: onToggleESWT },
    { key: 'isTraction', label: '견인', icon: ArrowUpFromLine, activeClass: 'bg-orange-500 text-white shadow-orange-200 border-transparent', onClick: onToggleTraction },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-slate-800 shrink-0">
       <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 px-1">
         상태 표시 (Status)
       </span>
       <div className="grid grid-cols-5 gap-2">
           {toggles.map((item) => {
             const isActive = bed[item.key as keyof BedState];
             return (
               <button
                 key={item.key}
                 onClick={() => item.onClick && item.onClick(bed.id)}
                 className={`
                   group relative flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all duration-200 active:scale-95
                   ${isActive 
                     ? `${item.activeClass} shadow-md` 
                     : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                   }
                 `}
               >
                 <item.icon className={`w-4 h-4 mb-1 ${isActive ? 'animate-bounce' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all'}`} strokeWidth={2.5} />
                 <span className="text-[10px] font-bold leading-none">{item.label}</span>
                 
                 {isActive && (
                   <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/40" />
                 )}
               </button>
             );
           })}
       </div>
    </div>
  );
};
