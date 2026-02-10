
import { useState, useEffect, useCallback } from 'react';

export const usePatientLogVisibility = () => {
  // Initial state based on screen width (Desktop defaults to open, Mobile defaults to closed)
  const [isLogOpen, setLogOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1280;
    }
    return false;
  });

  // Handle History Logic for Mobile/Tablet
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // 1. Check if we are in the "Log Open" state
      // We look for a specific flag in the history state
      const isLogHistoryState = event.state?.panel === 'patientLog';

      // 2. If the history state says "log is open", we ensure UI is open.
      // Otherwise, we close it.
      // NOTE: We rely on the presence of the state flag. If it's missing, we assume we are back at base.
      if (window.innerWidth < 1280) {
        if (isLogHistoryState) {
          setLogOpen(true);
        } else {
          // If we popped back to a state WITHOUT panel='patientLog', close the log.
          setLogOpen(false);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync Logic: When isLogOpen changes via UI (Toggle Button), manage History
  useEffect(() => {
    const isMobile = window.innerWidth < 1280;
    
    if (isMobile && isLogOpen) {
      // If opening on mobile, push a new history entry
      // Check if we already have this state to avoid duplicate pushes
      if (window.history.state?.panel !== 'patientLog') {
        window.history.pushState({ panel: 'patientLog' }, '');
      }
    }
  }, [isLogOpen]);

  const toggleLog = useCallback(() => {
    setLogOpen(prev => {
      const nextState = !prev;
      const isMobile = window.innerWidth < 1280;

      // Closing via Toggle Button
      if (!nextState && isMobile) {
        // If we are closing, and the current history state is the log, go back.
        if (window.history.state?.panel === 'patientLog') {
           window.history.back();
           // Important: We return `prev` (true) here initially to let popstate handle the UI update.
           // However, if back() doesn't fire popstate immediately (rare but possible), the UI might stick.
           // The popstate listener will effectively set it to false.
           return prev; 
        }
      }
      
      return nextState;
    });
  }, []);

  const closeLog = useCallback(() => {
    const isMobile = window.innerWidth < 1280;
    
    if (isMobile) {
        // Mobile: Check if we need to pop history
        if (window.history.state?.panel === 'patientLog') {
            window.history.back();
        } else {
            // Fallback: If history state is not patientLog (e.g. lost state or desktop mode switch), force close
            setLogOpen(false);
        }
    } else {
        // Desktop: Just update state
        setLogOpen(false);
    }
  }, []);

  return { isLogOpen, toggleLog, closeLog, setLogOpen };
};
