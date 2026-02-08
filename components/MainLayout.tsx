
import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { Minimize, GripVertical } from 'lucide-react';
import { useHeaderScroll } from '../hooks/useHeaderScroll';
import { AppHeader } from './AppHeader';
import { BedLayoutContainer } from './BedLayoutContainer';
import { useTreatmentContext } from '../contexts/TreatmentContext';
import { GlobalModals } from './GlobalModals';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Code Splitting for performance
const PatientLogPanel = React.lazy(() => import('./PatientLogPanel').then(module => ({ default: module.PatientLogPanel })));

export const MainLayout: React.FC = () => {
  const { beds, presets } = useTreatmentContext();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isDarkMode, setDarkMode] = useState(false);
  
  // Sidebar Width State (Persisted)
  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>('log-sidebar-width', 620);
  const [isResizing, setIsResizing] = useState(false);

  // Initialize based on screen width: Open by default on XL screens (Desktop)
  const [isLogOpen, setLogOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1280;
    }
    return false;
  });
  
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  useHeaderScroll(mainRef, headerRef);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // --- Resizing Logic ---
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      // Calculate width from the right edge
      const newWidth = window.innerWidth - mouseMoveEvent.clientX;
      // Constraints: Min 300px (visible area), Max 80% of screen
      if (newWidth > 300 && newWidth < window.innerWidth * 0.8) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing, setSidebarWidth]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none'; 
      document.body.style.cursor = 'col-resize';
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, resize, stopResizing]);


  // Dynamic class generation for main content area to handle Full Screen transitions
  // Updated header height calculation for Tablet Compact Mode (52px)
  const mainContentPadding = isFullScreen 
    ? 'pt-[calc(env(safe-area-inset-top)+8px)] md:pt-[26px]' 
    : `
      pt-[calc(62px+env(safe-area-inset-top)+1rem)] 
      landscape:pt-[calc(2.5rem+env(safe-area-inset-top))]
      md:pt-[calc(52px+env(safe-area-inset-top)+1rem)]
      xl:pt-[calc(72px+env(safe-area-inset-top)+1rem)]
      md:landscape:pt-2
    `;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-gray-100 dark:bg-slate-950 landscape:bg-transparent relative">
      {/* 
        Header Wrapper
        - Hidden when isFullScreen is true
        - Updated height with md:h-[52px] for tablet compactness
      */}
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
            onToggleLog={() => setLogOpen(prev => !prev)}
            onToggleFullScreen={() => setIsFullScreen(true)}
          />
        </div>
      )}

      {/* 
        Main Content Area Wrapper
        - Handles Split Layout for Desktop (Bed List | Patient Log)
      */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Bed List Container */}
        <main 
          ref={mainRef}
          className={`
            flex-1 overflow-x-auto overflow-y-auto scroll-smooth touch-pan-x touch-pan-y overscroll-contain 
            bg-gray-200 dark:bg-slate-950 landscape:bg-transparent
            transition-all duration-300 ease-in-out
            
            /* Base Padding */
            px-0 
            ${mainContentPadding}
            pb-[calc(env(safe-area-inset-bottom)+1.5rem)]
            
            /* Tablet/Large Phone Portrait */
            sm:px-2 
            
            /* Desktop/Tablet Defaults (md+) */
            md:p-4 
            
            /* Mobile Landscape Overrides */
            landscape:px-0 
            landscape:pb-[env(safe-area-inset-bottom)]
            
            md:landscape:px-0
            md:landscape:pb-[env(safe-area-inset-bottom)]
          `}
        >
          <BedLayoutContainer beds={beds} presets={presets} />
        </main>

        {/* Exit Full Screen Button - Visible only in Full Screen Mode */}
        {isFullScreen && (
          <button
            onClick={() => setIsFullScreen(false)}
            className="fixed top-4 right-4 z-[60] p-2 bg-black/30 dark:bg-white/10 text-gray-500 dark:text-gray-300 hover:text-white hover:bg-black/50 dark:hover:bg-white/20 rounded-full backdrop-blur-md shadow-lg transition-all active:scale-95"
            title="전체 화면 종료"
          >
            <Minimize className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* 
          Resizable Sidebar Logic (Desktop Only)
        */}
        {/* Resizer Handle */}
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

        {/* 
          Right: Patient Log Sidebar (Desktop)
          - Hidden on Mobile (< XL)
          - Hidden in Full Screen Mode
          - Animated Width & Slide for smooth toggle
          - Dynamic Width controlled by sidebarWidth state
          - Added 'overflow-x-auto' to enable scrolling when shrunk
        */}
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
           {/* Inner container with min-width to maintain default size layout when shrunk */}
           <div 
             className="h-full border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
             style={{ 
                minWidth: '620px', // Prevent inner content from squashing
                width: '100%'      // Allow expansion if sidebar is wider than 620px
             }}
           >
             <Suspense fallback={<div className="w-full h-full bg-white dark:bg-slate-900 animate-pulse" />}>
               <PatientLogPanel />
             </Suspense>
           </div>
        </aside>

        {/* Mobile/Tablet Patient Log Overlay (Visible on < XL screens) */}
        <div className={`
          fixed inset-0 z-[100] bg-white dark:bg-slate-900 transition-transform duration-300 xl:hidden flex flex-col
          ${isLogOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
           <div className="flex-1 w-full h-full relative pb-[env(safe-area-inset-bottom)]">
             <Suspense fallback={<div className="w-full h-full bg-white dark:bg-slate-900 flex items-center justify-center"><span className="text-gray-400 font-bold">로딩 중...</span></div>}>
                <PatientLogPanel onClose={() => setLogOpen(false)} />
             </Suspense>
           </div>
        </div>
      </div>

      <GlobalModals 
        isMenuOpen={isMenuOpen} 
        onCloseMenu={() => setMenuOpen(false)} 
        presets={presets}
      />
    </div>
  );
};
