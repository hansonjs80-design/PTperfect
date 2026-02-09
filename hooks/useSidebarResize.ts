
import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export const useSidebarResize = (initialWidth: number = 620) => {
  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>('log-sidebar-width', initialWidth);
  const [isResizing, setIsResizing] = useState(false);

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

  return { sidebarWidth, isResizing, startResizing };
};
