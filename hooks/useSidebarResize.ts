import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

export const useSidebarResize = (initialWidth: number = 620) => {
  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>('log-sidebar-width', initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const startResizing = useCallback((e?: { clientX: number } | MouseEvent) => {
    const startX = (e && 'clientX' in e) ? e.clientX : window.innerWidth - sidebarWidth;
    resizeStartRef.current = { startX, startWidth: sidebarWidth };
    setIsResizing(true);
  }, [sidebarWidth]);

  const stopResizing = useCallback(() => {
    resizeStartRef.current = null;
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (!isResizing || !resizeStartRef.current) return;

    const { startX, startWidth } = resizeStartRef.current;
    // Dragging handle to the LEFT should make log panel wider.
    const deltaX = startX - mouseMoveEvent.clientX;
    const nextWidth = startWidth + deltaX;

    // Constraints: Min 300px (visible area), Max 80% of screen
    const clampedWidth = Math.min(window.innerWidth * 0.8, Math.max(300, nextWidth));
    setSidebarWidth(clampedWidth);
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
