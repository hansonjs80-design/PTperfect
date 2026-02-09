
import React, { useCallback, useRef } from 'react';

export const useGridNavigation = (totalCols: number) => {
  // Local ref to debounce repeated keydown events on the SAME element
  const lastNavTime = useRef(0);

  const moveFocus = useCallback((currentRow: number, currentCol: number, direction: 'up' | 'down' | 'left' | 'right') => {
    let nextRow = currentRow;
    let nextCol = currentCol;

    switch (direction) {
      case 'up':
        nextRow = currentRow - 1;
        break;
      case 'down':
        nextRow = currentRow + 1;
        break;
      case 'left':
        nextCol = currentCol - 1;
        break;
      case 'right':
        nextCol = currentCol + 1;
        break;
    }

    // Find the next element by data attribute
    const nextElement = document.querySelector(`[data-grid-id="${nextRow}-${nextCol}"]`) as HTMLElement;
    
    if (nextElement) {
      // Use a small delay (10ms) to ensure the current event loop finishes 
      // and any immediate subsequent events (like ghost IME enters) fire on the *current* element 
      // (where they are debounced) rather than the *new* element.
      setTimeout(() => {
        nextElement.focus();
        // If it's an input, select text
        if (nextElement.tagName === 'INPUT') {
          (nextElement as HTMLInputElement).select();
        }
      }, 10);
    }
  }, []);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: number, isInput: boolean = false, inputElement?: HTMLInputElement | null) => {
    // Only handle navigation on Desktop/Tablet
    if (window.innerWidth < 768) return;

    // Prevent navigation if IME composition is active (Korean input)
    if (e.nativeEvent.isComposing) {
        return;
    }

    // Debounce check: Prevent double navigation events (e.g. from rapid key repeats or IME artifacts)
    const now = Date.now();
    if (now - lastNavTime.current < 100) { 
        // If less than 100ms since last navigation, ignore this event
        return; 
    }

    // Tab Navigation: Right (or Left with Shift)
    if (e.key === 'Tab') {
      e.preventDefault();
      lastNavTime.current = now;
      moveFocus(row, col, e.shiftKey ? 'left' : 'right');
      return;
    }

    // Enter Navigation: Down (Only for Inputs like Name, Memo, etc.)
    if (e.key === 'Enter' && isInput) {
      e.preventDefault();
      lastNavTime.current = now;
      moveFocus(row, col, 'down');
      return;
    }

    // Arrow Navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      // Logic for Input fields (EditableCell) - Allow cursor movement inside text
      if (isInput && inputElement) {
        const { selectionStart, selectionEnd, value } = inputElement;
        
        // Prevent cell navigation unless cursor is at the boundary
        if (e.key === 'ArrowLeft' && selectionStart !== 0) return;
        if (e.key === 'ArrowRight' && selectionEnd !== value.length) return;
        
        // Up/Down always navigates in grid
      }

      e.preventDefault();
      lastNavTime.current = now;
      
      const direction = 
        e.key === 'ArrowUp' ? 'up' :
        e.key === 'ArrowDown' ? 'down' :
        e.key === 'ArrowLeft' ? 'left' : 'right';
        
      moveFocus(row, col, direction);
    }
  }, [moveFocus]);

  return { handleGridKeyDown };
};
