
import React from 'react';
import { Syringe, Hand, Zap, ArrowUpFromLine, Droplet } from 'lucide-react';

interface OptionTogglesProps {
  options: { isInjection: boolean; isManual: boolean; isESWT: boolean; isTraction: boolean; isFluid?: boolean };
  setOptions: React.Dispatch<React.SetStateAction<any>>;
}

export const OptionToggles: React.FC<OptionTogglesProps> = ({ options, setOptions }) => {
  const toggle = (key: string) => {
    setOptions((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const buttons = [
    { key: 'isInjection', label: '주사', icon: Syringe, activeClass: 'bg-red-500 text-white shadow-red-200 border-transparent', textClass: 'group-hover:text-red-600' },
    { key: 'isFluid', label: '수액', icon: Droplet, activeClass: 'bg-cyan-500 text-white shadow-cyan-200 border-transparent', textClass: 'group-hover:text-cyan-600' },
    { key: 'isManual', label: '도수', icon: Hand, activeClass: 'bg-violet-500 text-white shadow-violet-200 border-transparent', textClass: 'group-hover:text-violet-600' },
    { key: 'isESWT', label: '충격파', icon: Zap, activeClass: 'bg-blue-500 text-white shadow-blue-200 border-transparent', textClass: 'group-hover:text-blue-600' },
    { key: 'isTraction', label: '견인', icon: ArrowUpFromLine, activeClass: 'bg-orange-500 text-white shadow-orange-200 border-transparent', textClass: 'group-hover:text-orange-600' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 p-3 shrink-0">
      <div className="grid grid-cols-5 gap-2">
        {buttons.map(({ key, label, icon: Icon, activeClass }) => {
          const isActive = options[key as keyof typeof options];
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`
                group relative flex flex-col items-center justify-center py-2.5 rounded-2xl border transition-all duration-200 active:scale-95
                ${isActive 
                  ? `${activeClass} shadow-lg` 
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                }
              `}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'animate-bounce' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all'}`} strokeWidth={2.5} />
              <span className="text-[10px] font-bold leading-none">{label}</span>
              
              {isActive && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white/40" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
