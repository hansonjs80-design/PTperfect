
import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { Minimize } from 'lucide-react';
import { useHeaderScroll } from '../hooks/useHeaderScroll';
import { AppHeader } from './AppHeader';
import { BedLayoutContainer } from './BedLayoutContainer';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { GlobalModals } from './GlobalModals';
import { usePatientLogVisibility } from '../hooks/usePatientLogVisibility';
import { useLayoutStyles } from '../hooks/useLayoutStyles';

const PatientLogPanel = React.lazy(() => import('./PatientLogPanel').then(module => ({ default: module.PatientLogPanel })));

export const MainLayout: React.FC = () => {
  const { beds, presets, undo, canUndo } = useTreatmentContext();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isDarkMode, setDarkMode] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Custom Hooks
  const { isLogOpen, toggleLog, closeLog } = usePatientLogVisibility(); 
  const { headerHeightClass, mainContentPaddingTop, mainContentPaddingBottom, closeButtonClass } = useLayoutStyles(isFullScreen);
  
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  useHeaderScroll(mainRef, headerRef);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = !!activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable
      );

      if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleLog();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!isTyping && canUndo) {
          e.preventDefault();
          undo();
        }
        return;
      }

      const isOptionTabToggle = (
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        (e.altKey || e.getModifierState?.('AltGraph')) &&
        (e.key === 'Tab' || e.code === 'Tab' || e.keyCode === 9)
      );
      if (isOptionTabToggle && !isTyping) {
        e.preventDefault();
        toggleLog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, canUndo, toggleLog]);

  const handleCloseMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-gray-200 dark:bg-slate-950 landscape:bg-transparent relative">
      {!isFullScreen && (
        <div 
          ref={headerRef}
          className={headerHeightClass}
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
            flex-1 overflow-x-hidden overflow-y-auto scroll-smooth touch-pan-x touch-pan-y overscroll-contain
            bg-gray-200 dark:bg-slate-950 landscape:bg-transparent
            transition-all duration-300 ease-in-out
            px-0 pb-0
            ${mainContentPaddingTop}
            sm:px-2
            md:px-0 md:pb-0 md:overflow-y-hidden md:flex md:flex-col
            landscape:overflow-x-auto landscape:overflow-y-auto landscape:px-0
            md:landscape:px-0 md:landscape:pt-0
          `}
        >
          <BedLayoutContainer beds={beds} presets={presets} />
        </main>

        {isFullScreen && (
          <button
            onClick={() => setIsFullScreen(false)}
            className={closeButtonClass}
            title="전체 화면 종료"
          >
            <Minimize className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Unified Overlay Sidebar (Desktop/Mobile/Tablet) */}
        <div className={`
          fixed inset-0 z-[100] bg-white dark:bg-slate-900 transition-transform duration-300 flex flex-col
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
