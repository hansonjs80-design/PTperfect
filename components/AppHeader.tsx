
import React from 'react';
import { Menu, Sun, Moon, Download, ClipboardList, Maximize, Activity, ArrowUpDown, ChevronLeft, ChevronRight, CalendarCheck, Printer, X, Undo2, Redo2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { usePatientLogContext } from '../contexts/PatientLogContext';

interface AppHeaderProps {
  onOpenMenu: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isLogOpen: boolean;
  onToggleLog: () => void;
  onToggleFullScreen: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenMenu,
  isDarkMode,
  onToggleDarkMode,
  isLogOpen,
  onToggleLog,
  onToggleFullScreen,
}) => {
  const { isInstallable, install } = usePWAInstall();
  const { layoutMode, toggleLayoutMode, undo, redo, canUndo, canRedo, setPrintModalOpen } = useTreatmentContext();
  const { visits, currentDate, changeDate, setCurrentDate } = usePatientLogContext();

  const handleTodayClick = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset).toISOString().split('T')[0];
    setCurrentDate(localDate);
  };

  // 공통 버튼 스타일
  const buttonClass = "relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-9 md:h-9 xl:w-10 xl:h-10 landscape:w-9 landscape:h-9 lg:landscape:w-10 lg:landscape:h-10 rounded-xl transition-all duration-200 active:scale-90 hover:bg-white/80 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700";
  
  const activeButtonClass = "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800/50 shadow-inner";
  const activeLayoutBtnClass = "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50 shadow-inner";

  // Desktop Header Icons style (smaller, cleaner)
  const desktopIconClass = "flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed";

  const getLayoutRotation = () => {
    if (layoutMode === 'alt') return 'rotate-180';
    if (layoutMode === 'option3') return 'rotate-90';
    return 'rotate-0';
  };

  return (
    <header className="flex flex-col justify-end w-full h-full bg-white/75 dark:bg-slate-950/75 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 z-30 pt-[env(safe-area-inset-top)] transition-colors duration-300">
      <div className="flex items-center justify-between px-3 sm:px-5 h-[62px] sm:h-[72px] md:h-[52px] xl:h-[60px] landscape:h-12 lg:landscape:h-[60px] shrink-0 w-full">
        
        {/* Left: Menu & Logo */}
        <div className="flex items-center gap-3 sm:gap-4 md:gap-3 xl:gap-4">
          <button 
            onClick={onOpenMenu} 
            className={`${buttonClass}`}
            aria-label="Main Menu"
          >
            <Menu className="w-6 h-6 sm:w-6 sm:h-6 md:w-5 md:h-5 xl:w-5 xl:h-5 landscape:w-5 landscape:h-5 lg:landscape:w-5 lg:landscape:h-5" strokeWidth={2.5} />
          </button>
          
          <div className="hidden sm:flex items-center gap-2 select-none group cursor-default">
            <div className="p-1.5 md:p-1 xl:p-1.5 bg-brand-600 rounded-lg shadow-lg shadow-brand-500/30 group-hover:scale-110 transition-transform duration-300">
               <Activity className="w-4 h-4 sm:w-5 sm:h-5 md:w-4 md:h-4 xl:w-5 xl:h-5 text-white" strokeWidth={3} />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-xl xl:text-2xl landscape:text-lg lg:landscape:text-2xl font-black text-slate-800 dark:text-white tracking-tighter leading-none flex items-center">
              PHYSIO<span className="text-brand-600">TRACK</span>
            </h1>
          </div>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          
          {/* Desktop Patient Log Controls (Visible only on Desktop when Log is Open) */}
          {isLogOpen && (
            <div className="hidden xl:flex items-center gap-3 mr-4 border-r border-slate-200 dark:border-slate-700 pr-4 animate-in fade-in slide-in-from-right-4 duration-300">
               {/* Total Badge */}
               <div className="flex flex-col items-center justify-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 min-w-[40px]">
                 <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none mb-0.5">Total</span>
                 <span className="text-sm font-black text-brand-600 dark:text-brand-400 leading-none">{visits.length}</span>
               </div>

               {/* Undo/Redo */}
               <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                  <button onClick={undo} disabled={!canUndo} className={desktopIconClass} title="되돌리기"><Undo2 className="w-4 h-4" /></button>
                  <button onClick={redo} disabled={!canRedo} className={desktopIconClass} title="다시 실행"><Redo2 className="w-4 h-4" /></button>
               </div>

               {/* Date Nav */}
               <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-700">
                  <button onClick={() => changeDate(-1)} className={desktopIconClass}><ChevronLeft className="w-4 h-4" /></button>
                  <div className="relative flex items-center justify-center h-8 px-2 group cursor-pointer min-w-[90px]">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums tracking-tight">{currentDate}</span>
                    <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  </div>
                  <button onClick={() => changeDate(1)} className={desktopIconClass}><ChevronRight className="w-4 h-4" /></button>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                  <button onClick={handleTodayClick} className={`${desktopIconClass} text-brand-500 hover:text-brand-600 bg-white dark:bg-slate-700 shadow-sm`} title="오늘"><CalendarCheck className="w-4 h-4" /></button>
               </div>

               {/* Print */}
               <button onClick={() => setPrintModalOpen(true)} className="flex items-center justify-center w-9 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 rounded-xl text-slate-500 hover:text-brand-600 transition-all shadow-sm active:scale-95" title="출력">
                 <Printer className="w-5 h-5" strokeWidth={2} />
               </button>
            </div>
          )}

          {isInstallable && (
            <button 
              onClick={install}
              className="hidden xs:flex items-center gap-2 px-4 py-2 md:py-1.5 xl:py-1.5 landscape:py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95 font-bold text-xs sm:text-sm md:text-xs xl:text-xs animate-in fade-in slide-in-from-top-2 mr-2"
            >
              <Download className="w-4 h-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">설치</span>
            </button>
          )}

          <button 
            onClick={onToggleFullScreen}
            className={`${buttonClass}`}
            aria-label="Full Screen"
            title="전체 화면"
          >
            <Maximize className="w-5 h-5 md:w-4 md:h-4 xl:w-5 xl:h-5 landscape:w-4 landscape:h-4 lg:landscape:w-5 lg:landscape:h-5" strokeWidth={2.5} />
          </button>

          <button 
            onClick={onToggleLog}
            className={`${buttonClass} ${isLogOpen ? activeButtonClass : ''}`}
            aria-label="Patient Log"
            title={isLogOpen ? "환자 현황 닫기" : "환자 현황 열기"}
          >
            <ClipboardList className="w-5 h-5 md:w-4 md:h-4 xl:w-5 xl:h-5 landscape:w-4 landscape:h-4 lg:landscape:w-5 lg:landscape:h-5" strokeWidth={2.5} />
            {isLogOpen && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>

          <button
            onClick={toggleLayoutMode}
            className={`${buttonClass} ${layoutMode !== 'default' ? activeLayoutBtnClass : ''}`}
            title="배드 배치 변경"
          >
            <ArrowUpDown 
              className={`
                w-5 h-5 md:w-4 md:h-4 xl:w-5 xl:h-5 landscape:w-4 landscape:h-4 lg:landscape:w-5 lg:landscape:h-5
                transition-transform duration-500 ease-in-out
                ${getLayoutRotation()}
              `} 
              strokeWidth={2.5} 
            />
          </button>

          <button 
            onClick={onToggleDarkMode} 
            className={buttonClass}
            title={isDarkMode ? '라이트 모드' : '다크 모드'}
          >
            <div className="relative w-6 h-6 flex items-center justify-center">
                <Sun className={`w-5 h-5 md:w-4 md:h-4 xl:w-5 xl:h-5 landscape:w-4 landscape:h-4 lg:landscape:w-5 lg:landscape:h-5 absolute transition-all duration-300 ${isDarkMode ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} strokeWidth={2.5} />
                <Moon className={`w-5 h-5 md:w-4 md:h-4 xl:w-5 xl:h-5 landscape:w-4 landscape:h-4 lg:landscape:w-5 lg:landscape:h-5 text-brand-400 absolute transition-all duration-300 ${isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} strokeWidth={2.5} />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
