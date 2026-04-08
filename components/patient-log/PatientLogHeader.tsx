
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, CalendarCheck, Printer, X, Undo2, Redo2, Trash2, PowerOff } from 'lucide-react';

interface PatientLogHeaderProps {
  totalCount: number;
  injectionCount?: number;
  ionCount?: number;
  manualCount?: number;
  eswtCount?: number;
  currentDate: string;
  onDateChange: (offset: number) => void;
  onDateSelect: (date: string) => void;
  onOpenSummary?: () => void;
  onPrint: () => void;
  onClose?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onClearAllBeds?: () => void;
  canClearAllBeds?: boolean;
  isBedActivationDisabled?: boolean;
  onToggleBedActivationDisabled?: () => void;
}

export const PatientLogHeader: React.FC<PatientLogHeaderProps> = ({
  totalCount,
  injectionCount = 0,
  ionCount = 0,
  manualCount = 0,
  eswtCount = 0,
  currentDate,
  onDateChange,
  onDateSelect,
  onOpenSummary,
  onPrint,
  onClose,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onClearAllBeds,
  canClearAllBeds = false,
  isBedActivationDisabled = false,
  onToggleBedActivationDisabled,
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const formatHeaderDate = (value: string) => {
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;

    const parsed = new Date(`${value}T00:00:00`);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = Number.isNaN(parsed.getTime()) ? '' : ` (${weekdays[parsed.getDay()]})`;

    return `${year}년 ${month}월 ${day}일${weekday}`;
  };

  const handleTodayClick = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset).toISOString().split('T')[0];
    onDateSelect(localDate);
  };

  const handleUndoRedo = (type: 'undo' | 'redo') => {
    if (type === 'undo') onUndo?.();
    else onRedo?.();
  };

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;

    try {
      const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
      pickerInput.showPicker?.();
    } catch {
      // ignore and fallback below
    }

    input.focus();
    input.click();
  };

  // 공통 버튼 스타일 정의
  const iconBtnClass = "flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all shadow-sm hover:shadow active:scale-95 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed";
  const summaryPills = [
    { label: '주사', count: injectionCount, className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/40' },
    { label: '이온', count: ionCount, className: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800/40' },
    { label: '도수', count: manualCount, className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40' },
    { label: '충격파', count: eswtCount, className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/40' },
  ];

  return (
    <div className="shrink-0 z-20 flex flex-row items-center justify-between px-2 sm:px-3 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 transition-colors">
      
      {/* Left: Count Badge Only (Removed Title & Icon) */}
      <div className="flex items-center gap-2 shrink-0">
         <button
           type="button"
           onClick={onOpenSummary}
           className="flex flex-col items-center justify-center px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 min-w-[42px] shadow-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
         >
           <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none mb-0.5">Total</span>
           <span className="text-sm sm:text-base font-black text-brand-600 dark:text-brand-400 leading-none">{totalCount}</span>
         </button>
         <div className="hidden md:flex items-center gap-1.5">
           {summaryPills.map((item) => (
             <div
               key={item.label}
               className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 shadow-sm ${item.className}`}
             >
               <span className="text-[10px] font-black tracking-[-0.01em]">{item.label}</span>
               <span className="text-[11px] font-black tabular-nums">{item.count}</span>
             </div>
           ))}
         </div>
      </div>
      
      {/* Right: Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden justify-end flex-1 pl-2">
         <button
           onClick={() => onToggleBedActivationDisabled?.()}
           className={`flex items-center gap-1 px-2.5 h-8 sm:h-9 rounded-lg border transition-all active:scale-95 shrink-0 ${
             isBedActivationDisabled
               ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-200'
               : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
           }`}
           title="켜면 배드를 활성화하지 않고 로그만 입력합니다"
         >
           <PowerOff className="w-3.5 h-3.5" />
           <span className="hidden sm:inline text-[11px] font-black">
             {isBedActivationDisabled ? '배드 비활성화 ON' : '배드 비활성화'}
           </span>
         </button>

         
         {/* Bulk Clear Active Beds */}
         <button
           onClick={() => onClearAllBeds?.()}
           disabled={!canClearAllBeds}
           className="flex items-center justify-center w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/35 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
           title="활성 침상 일괄 비우기"
         >
           <Trash2 className="w-3.5 h-3.5" />
         </button>

         {/* Undo/Redo Group */}
         <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shrink-0">
            <button 
              onClick={() => handleUndoRedo('undo')} 
              disabled={!canUndo}
              className={`${iconBtnClass} w-7 h-7 sm:w-8 sm:h-8 hover:bg-white dark:hover:bg-slate-700`}
              title="되돌리기"
            >
              <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button 
              onClick={() => handleUndoRedo('redo')} 
              disabled={!canRedo}
              className={`${iconBtnClass} w-7 h-7 sm:w-8 sm:h-8 hover:bg-white dark:hover:bg-slate-700`}
              title="다시 실행"
            >
              <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
         </div>

         {/* Date Navigator Capsule */}
         <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-0.5 sm:p-1 rounded-xl border border-slate-200/50 dark:border-slate-700 shrink-0">
          <button 
            onClick={() => onDateChange(-1)}
            className={`${iconBtnClass} w-7 h-7 sm:w-9 sm:h-9`}
            title="이전 날짜"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
          </button>
          
          {/* Date Display */}
          <div
            className="relative flex items-center justify-center h-7 sm:h-9 px-1.5 sm:px-2 group cursor-pointer"
            onClick={openDatePicker}
          >
            <span className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-100 tabular-nums tracking-tight whitespace-nowrap">
              {formatHeaderDate(currentDate)}
            </span>
            <input 
              ref={dateInputRef}
              type="date" 
              value={currentDate}
              onChange={(e) => onDateSelect(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="날짜 선택"
            />
            <div className="absolute inset-x-2 bottom-0.5 h-0.5 bg-brand-500/0 group-hover:bg-brand-500/50 transition-all rounded-full"></div>
          </div>
          
          <button 
            onClick={() => onDateChange(1)}
            className={`${iconBtnClass} w-7 h-7 sm:w-9 sm:h-9`}
            title="다음 날짜"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
          </button>

          <div className="w-px h-3 sm:h-4 bg-slate-300 dark:bg-slate-600 mx-0.5 sm:mx-1 block shrink-0"></div>

          <button 
            onClick={handleTodayClick}
            className={`${iconBtnClass} text-brand-500 hover:text-brand-600 bg-white dark:bg-slate-700 shadow-sm w-7 h-7 sm:w-9 sm:h-9`}
            title="오늘 날짜로 이동"
          >
            <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
          </button>
        </div>
        
        {/* Actions Group */}
        <div className="flex items-center gap-1 shrink-0">
           {/* Print Button */}
           <button 
             onClick={onPrint}
             className="hidden sm:flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 rounded-xl text-slate-500 hover:text-brand-600 transition-all shadow-sm active:scale-95 shrink-0"
             title="리스트 출력 (Print)"
           >
             <Printer className="w-5 h-5" strokeWidth={2.5} />
           </button>

           {/* Close Button */}
           {onClose && (
            <button 
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-slate-600 dark:text-slate-300 transition-all shadow-inner active:scale-95 shrink-0"
              title="창 닫기"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={3} />
            </button>
           )}
        </div>
      </div>
    </div>
  );
};
