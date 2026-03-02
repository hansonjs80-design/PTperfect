
import React, { useRef, useCallback } from 'react';

/**
 * Provides a click handler that adapts to device size:
 * - Tablet/Desktop (>= 768px): Trigger action on Single Click.
 * - Mobile (< 768px): Trigger action on Single Tap.
 * 
 * @param action The function to execute when the gesture is detected.
 * @param preventDefault Whether to call e.preventDefault() (default: true)
 * @param stopPropagation Whether to call e.stopPropagation() (default: true)
 */
export const useResponsiveClick = (
  action: (e: React.MouseEvent) => void,
  preventDefault = true,
  stopPropagation = true
) => {
  const lastClickTimeRef = useRef<number>(0);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // 1. Tablet & Desktop (>= 768px) -> Single Click
    if (window.innerWidth >= 768) {
      if (preventDefault) e.preventDefault();
      if (stopPropagation) e.stopPropagation();
      action(e);
      return;
    }

    // 2. Mobile (< 768px) -> Single Tap
    if (preventDefault) e.preventDefault();
    if (stopPropagation) e.stopPropagation();
    action(e);
    lastClickTimeRef.current = Date.now();
  }, [action, preventDefault, stopPropagation]);

  return handleClick;
};
