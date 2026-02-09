
import React, { useCallback } from 'react';

// Global variable to debounce navigation events across ALL grid cells.
// Increased to 300ms to handle heavy operations like Row Creation/Re-render smoothly.
let lastGlobalNavTime = 0;

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
      // Use a small delay to ensure the current event loop finishes
      // and focus moves AFTER any pending re-renders.
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

    // Global Debounce check
    const now = Date.now();
    // 300ms prevents double-firing when a Row Creation triggers a heavy Re-render
    if (now - lastGlobalNavTime < 300) { 
        // Prevent default even if debounced, to stop native focus jumps during the cooldown
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
        }
        return; 
    }

    // Tab Navigation
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      lastGlobalNavTime = now;
      moveFocus(row, col, e.shiftKey ? 'left' : 'right');
      return;
    }

    // Enter Navigation
    if (e.key === 'Enter' && isInput) {
      // [Important] IME Composition Handling
      // If we are composing (typing Korean), ignore the 'Enter' that ends composition.
      // We only want to act on the final 'Enter' keydown.
      if (e.nativeEvent.isComposing) {
          return;
      }

      e.preventDefault();
      e.stopPropagation();
      lastGlobalNavTime = now;
      moveFocus(row, col, 'down');
      return;
    }

    // Arrow Navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      // If composing, let the user navigate inside the text (e.g. choosing suggestions)
      if (e.nativeEvent.isComposing) {
          return;
      }

      // Logic for Input fields: Check cursor position
      if (isInput && inputElement) {
        const { selectionStart, selectionEnd, value } = inputElement;
        
        // Block navigation if cursor is NOT at the boundary
        // Left: Must be at start
        if (e.key === 'ArrowLeft' && selectionStart !== 0 && selectionStart !== null) return;
        // Right: Must be at end
        if (e.key === 'ArrowRight' && selectionEnd !== value.length && selectionEnd !== null) return;
        
        // Up/Down: Always navigate (override multiline inputs if any)
      }

      // Strict Event Stopping
      e.preventDefault();
      e.stopPropagation();
      
      lastGlobalNavTime = now;
      
      const direction = 
        e.key === 'ArrowUp' ? 'up' :
        e.key === 'ArrowDown' ? 'down' :
        e.key === 'ArrowLeft' ? 'left' : 'right';
        
      moveFocus(row, col, direction);
    }
  }, [moveFocus]);

  return { handleGridKeyDown };
};
