
import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { Minimize, GripVertical } from 'lucide-react';
import { useHeaderScroll } from '../hooks/useHeaderScroll';
import { AppHeader } from './AppHeader';
import { BedLayoutContainer } from './BedLayoutContainer';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { GlobalModals } from './GlobalModals';
import { useSidebarResize } from '../hooks/useSidebarResize';
import { usePatientLogVisibility } from '../hooks/usePatientLogVisibility';

const PatientLogPanel = React.lazy(() => import('./PatientLogPanel').then(module => ({ default: module.PatientLogPanel })));

export const MainLayout: React.FC = () => {
  const { beds, presets, undo, canUndo } = useTreatmentContext();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isDarkMode, setDarkMode] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Custom Hooks
  const { sidebarWidth, isResizing, startResizing } = useSidebarResize(620);
  const { isLogOpen, toggleLog, closeLog } = usePatientLogVisibility(); // Logic extracted here
  
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  useHeaderScroll(mainRef, headerRef);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Global Keyboard Shortcut (Ctrl + Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const activeEl = document.activeElement;
        const isTyping = activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' || 
          (activeEl as HTMLElement).isContentEditable
        );

        if (!isTyping && canUndo) {
          e.preventDefault();
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, canUndo]);

  const mainContentPadding = isFullScreen 
    ? 'pt-[calc(env(safe-area-inset-top)+8px)] md:pt-[56px]' 
    : `
      pt-[calc(62px+env(safe-area-inset-top)+1rem)] 
      landscape:pt-[calc(2.5rem+env(safe-area-inset-top))]
      md:pt-[calc(12px+env(safe-area-inset-top)+1rem)]
      xl:pt-[calc(72px+env(safe-area-inset-top)+1rem)]
      md:landscape:pt-2
    `;

  // Memoize handleCloseMenu to prevent GlobalModals useEffect from re-triggering constantly
  const handleCloseMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-gray-100 dark:bg-slate-950 landscape:bg-transparent relative">
      {!isFullScreen && (
        <div 
          ref={headerRef}
          className="
            w-full z-40 will-change-transform
            h-[calc(62px+env(safe-area-inset-top))]
            md:h-[calc(52px+env(safe-area-inset-top))]
            xl:h-[calc(72px+env(safe-area-inset-top))]
            landscape:h-[calc(2.5rem+env(safe-area-inset-top))]
            absolute top-0 left-0 right-0
            md:relative md:top-auto md:left-auto md:right-auto md:shrink-0
          "
        >
          <AppHeader 
            onOpenMenu={() => setMenuOpen(true)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setDarkMode(!isDarkMode)}
            isLogOpen={isLogOpen}
            onToggleLog={toggleLog}
            onToggleFullScreen={() => setIsFullScreen(true)}
          />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <main 
          ref={mainRef}
          className={`
            flex-1 overflow-x-auto overflow-y-auto scroll-smooth touch-pan-x touch-pan-y overscroll-contain 
            bg-gray-200 dark:bg-slate-950 landscape:bg-transparent
            transition-all duration-300 ease-in-out
            px-0 
            ${mainContentPadding}
            pb-[env(safe-area-inset-bottom)]
            sm:px-2 
            md:p-4 
            md:pb-[env(safe-area-inset-bottom)]
            landscape:px-0 
            landscape:pb-[env(safe-area-inset-bottom)]
            md:landscape:px-0
            md:landscape:pb-[env(safe-area-inset-bottom)]
          `}
        >
          <BedLayoutContainer beds={beds} presets={presets} />
        </main>

        {isFullScreen && (
          <button
            onClick={() => setIsFullScreen(false)}
            className="fixed top-4 right-4 z-[60] p-2 bg-black/30 dark:bg-white/10 text-gray-500 dark:text-gray-300 hover:text-white hover:bg-black/50 dark:hover:bg-white/20 rounded-full backdrop-blur-md shadow-lg transition-all active:scale-95"
            title="전체 화면 종료"
          >
            <Minimize className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Desktop Sidebar Resizer */}
        {isLogOpen && !isFullScreen && (
          <div
            className={`hidden xl:flex w-3 hover:w-3 cursor-col-resize z-50 items-center justify-center -ml-1.5 transition-all group select-none ${isResizing ? 'bg-brand-500/10' : ''}`}
            onMouseDown={startResizing}
          >
            <div className={`w-1 h-12 rounded-full transition-all group-hover:h-20 group-hover:bg-brand-400 ${isResizing ? 'bg-brand-500 h-24' : 'bg-gray-300 dark:bg-slate-700'}`} />
            <div className={`absolute p-1 bg-white dark:bg-slate-800 rounded-full shadow-md border border-gray-200 dark:border-slate-700 transition-opacity ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
               <GripVertical className="w-3 h-3 text-gray-400" />
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside 
          ref={sidebarRef}
          className={`
            hidden xl:block 
            h-full shrink-0 relative z-30 
            transition-[width,opacity,transform] duration-300 ease-out overflow-x-auto custom-scrollbar
            ${isFullScreen ? '!hidden' : ''}
            ${isLogOpen ? 'opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-20 overflow-hidden'}
          `}
          style={{ width: isLogOpen ? sidebarWidth : 0 }}
        >
           <div 
             className="h-full border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
             style={{ minWidth: '620px', width: '100%' }}
           >
             <Suspense fallback={<div className="w-full h-full bg-white dark:bg-slate-900 animate-pulse" />}>
               <PatientLogPanel onClose={closeLog} />
             </Suspense>
           </div>
        </aside>

        {/* Mobile/Tablet Overlay Sidebar */}
        <div className={`
          fixed inset-0 z-[100] bg-white dark:bg-slate-900 transition-transform duration-300 xl:hidden flex flex-col
          ${isLogOpen ? 'translate-x-0' : 'translate-x-full'}
          pt-[env(safe-area-inset-top)]
        `}>
           <div className="flex-1 w-full h-full relative pb-[env(safe-area-inset-bottom)]">
             <Suspense fallback={<div className="w-full h-full bg-white dark:bg-slate-900 flex items-center justify-center"><span className="text-gray-400 font-bold">로딩 중...</span></div>}>
                <PatientLogPanel onClose={closeLog} />
             </Suspense>
           </div>
        </div>
      </div>

      <GlobalModals 
        isMenuOpen={isMenuOpen} 
        onCloseMenu={handleCloseMenu} 
        presets={presets}
      />
    </div>
  );
};
