
import React from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, CalendarCheck, Printer, X } from 'lucide-react';

interface PatientLogHeaderProps {
  totalCount: number;
  currentDate: string;
  onDateChange: (offset: number) => void;
  onDateSelect: (date: string) => void;
  onPrint: () => void;
  onClose?: () => void;
}

export const PatientLogHeader: React.FC<PatientLogHeaderProps> = ({
  totalCount,
  currentDate,
  onDateChange,
  onDateSelect,
  onPrint,
  onClose
}) => {
  const handleTodayClick = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset).toISOString().split('T')[0];
    onDateSelect(localDate);
  };

  // 공통 버튼 스타일 정의
  const iconBtnClass = "flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all shadow-sm hover:shadow active:scale-95";

  return (
    <div className="shrink-0 z-20 flex flex-row items-center justify-between px-3 sm:px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 transition-colors">
      
      {/* Left: Title & Count */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 bg-brand-500 rounded-xl shadow-lg shadow-brand-500/30 text-white">
             <ClipboardList className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="font-black text-base sm:text-lg text-slate-800 dark:text-white leading-none tracking-tight">
              환자 현황
            </h3>
          </div>
        </div>
        
        {/* Count Badge */}
        <div className="hidden xs:flex flex-col items-center justify-center px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
           <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none mb-0.5">Total</span>
           <span className="text-sm font-black text-brand-600 dark:text-brand-400 leading-none">{totalCount}</span>
        </div>
      </div>
      
      {/* Right: Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
         
         {/* Date Navigator Capsule */}
         <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700">
          <button 
            onClick={() => onDateChange(-1)}
            className={iconBtnClass}
            title="이전 날짜"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={3} />
          </button>
          
          <div className="relative mx-0.5 group">
            <input 
              type="date" 
              value={currentDate}
              onChange={(e) => onDateSelect(e.target.value)}
              className="bg-transparent font-black text-slate-700 dark:text-slate-200 outline-none text-center cursor-pointer text-xs sm:text-sm w-[90px] sm:w-[105px] h-full z-10 relative focus:text-brand-600 transition-colors"
            />
            {/* Hover visual cue */}
            <div className="absolute inset-x-1 bottom-0 h-0.5 bg-brand-500/0 group-hover:bg-brand-500/50 transition-all rounded-full"></div>
          </div>
          
          <button 
            onClick={() => onDateChange(1)}
            className={iconBtnClass}
            title="다음 날짜"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={3} />
          </button>

          {/* Vertical Divider */}
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1 hidden sm:block"></div>

          <button 
            onClick={handleTodayClick}
            className={`${iconBtnClass} hidden sm:flex text-brand-500 hover:text-brand-600 bg-white dark:bg-slate-700 shadow-sm`}
            title="오늘 날짜로 이동"
          >
            <CalendarCheck className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        
        {/* Actions Group */}
        <div className="flex items-center gap-1 pl-1">
           {/* Print Button */}
           <button 
             onClick={onPrint}
             className="hidden sm:flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 rounded-xl text-slate-500 hover:text-brand-600 transition-all shadow-sm active:scale-95"
             title="리스트 출력 (Print)"
           >
             <Printer className="w-5 h-5" strokeWidth={2.5} />
           </button>

           {/* Close Button (if applicable) */}
           {onClose && (
            <button 
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl text-slate-500 dark:text-slate-300 transition-all shadow-inner active:scale-95"
              title="닫기"
            >
              <X className="w-5 h-5" strokeWidth={3} />
            </button>
           )}
        </div>
      </div>
    </div>
  );
};
