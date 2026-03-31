
import React, { useCallback } from 'react';

// Global variable to debounce navigation events across ALL grid cells.
// Keep a small debounce to prevent duplicate key events while preserving smooth movement.
let lastGlobalNavTime = 0;

export const useGridNavigation = (totalCols: number) => {
  const findNextFocusableElement = useCallback((currentRow: number, currentCol: number, direction: 'up' | 'down' | 'left' | 'right') => {
    const deltaRow = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
    const deltaCol = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;

    let nextRow = currentRow + deltaRow;
    let nextCol = currentCol + deltaCol;

    for (let step = 0; step <= totalCols + 2; step += 1) {
      const nextElement = document.querySelector(`[data-grid-id="${nextRow}-${nextCol}"]`) as HTMLElement | null;
      if (nextElement && nextElement.getClientRects().length > 0) {
        return nextElement;
      }

      nextRow += deltaRow;
      nextCol += deltaCol;
    }

    return null;
  }, [totalCols]);

  const moveFocus = useCallback((currentRow: number, currentCol: number, direction: 'up' | 'down' | 'left' | 'right') => {
    const nextElement = findNextFocusableElement(currentRow, currentCol, direction);
    
    if (nextElement) {
      requestAnimationFrame(() => {
        nextElement.focus();
        // If it's an input, select text
        if (nextElement.tagName === 'INPUT') {
          (nextElement as HTMLInputElement).select();
        }
      });
    }
  }, [findNextFocusableElement]);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: number, isInput: boolean = false, inputElement?: HTMLInputElement | null) => {
    // Only handle navigation on Desktop/Tablet
    if (window.innerWidth < 768) return;

    const isPresetSelectorOpen = document.body.dataset.presetSelectorOpen === 'true';
    if (isPresetSelectorOpen && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Global Debounce check
    const now = Date.now();
    // Keep only a very small cooldown so held arrow keys still feel immediate.
    if (now - lastGlobalNavTime < 24) {
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
      const isStatusMenuOpen = document.body.dataset.patientStatusMenuOpen === 'true';
      if (isStatusMenuOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

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
