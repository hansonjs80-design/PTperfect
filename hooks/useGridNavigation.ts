
import React, { useCallback } from 'react';

export const useGridNavigation = (totalCols: number) => {
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
      nextElement.focus();
      // If it's an input, select text delayed to ensure focus handling completes
      if (nextElement.tagName === 'INPUT') {
        setTimeout(() => (nextElement as HTMLInputElement).select(), 0);
      }
    }
  }, []);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: number, isInput: boolean = false, inputElement?: HTMLInputElement | null) => {
    // Only handle navigation on Desktop/Tablet
    if (window.innerWidth < 768) return;

    // Tab Navigation: Right (or Left with Shift)
    if (e.key === 'Tab') {
      e.preventDefault();
      moveFocus(row, col, e.shiftKey ? 'left' : 'right');
      return;
    }

    // Enter Navigation: Down (Only for Inputs like Name, Memo, etc.)
    // For Selectors (Bed, Treatment), Enter opens the menu (handled in component)
    if (e.key === 'Enter' && isInput) {
      e.preventDefault();
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
      
      const direction = 
        e.key === 'ArrowUp' ? 'up' :
        e.key === 'ArrowDown' ? 'down' :
        e.key === 'ArrowLeft' ? 'left' : 'right';
        
      moveFocus(row, col, direction);
    }
  }, [moveFocus]);

  return { handleGridKeyDown };
};
