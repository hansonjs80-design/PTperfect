import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGridNavigation } from '../../hooks/useGridNavigation';
import { normalizeUpperEnglishKeyInput } from '../../utils/keyboardLayout';

interface GenderSelectorCellProps {
  gridId?: string;
  rowIndex: number;
  colIndex: number;
  value: string;
  onSelect: (val: string) => void;
}

const OPTIONS = ['M', 'F'];

export const GenderSelectorCell: React.FC<GenderSelectorCellProps> = ({
  gridId,
  rowIndex,
  colIndex,
  value,
  onSelect,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const cellRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { handleGridKeyDown } = useGridNavigation(11);

  useEffect(() => {
    if (!menuOpen) return;
    const selectedIndex = Math.max(0, OPTIONS.findIndex((opt) => opt === value));
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);

    requestAnimationFrame(() => {
      optionRefs.current[selectedIndex >= 0 ? selectedIndex : 0]?.focus();
    });
  }, [menuOpen, value]);

  const closeMenu = () => {
    setMenuOpen(false);
    setTimeout(() => cellRef.current?.focus(), 0);
  };

  const openMenu = (x: number, y: number) => {
    setMenuPos({ x, y });
    setMenuOpen(true);
  };

  const commitHighlightedOption = (index: number) => {
    const opt = OPTIONS[index];
    if (!opt) return;
    onSelect(value === opt ? '' : opt);
    closeMenu();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openMenu(e.clientX, e.clientY);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches) {
      e.preventDefault();
      e.stopPropagation();
      openMenu(e.clientX, e.clientY);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const rect = cellRef.current?.getBoundingClientRect();
      openMenu(rect ? rect.left + rect.width / 2 : 0, rect ? rect.bottom : 0);
      return;
    }

    const isPlainTypingKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (isPlainTypingKey) {
      const normalized = normalizeUpperEnglishKeyInput(e.key).trim();
      const candidate = normalized.slice(0, 1);
      if (candidate === 'M' || candidate === 'F') {
        e.preventDefault();
        e.stopPropagation();
        onSelect(candidate);
        return;
      }
    }

    handleGridKeyDown(e, rowIndex, colIndex);
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      const nextIndex = (highlightedIndex + 1) % OPTIONS.length;
      setHighlightedIndex(nextIndex);
      optionRefs.current[nextIndex]?.focus();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      const nextIndex = (highlightedIndex - 1 + OPTIONS.length) % OPTIONS.length;
      setHighlightedIndex(nextIndex);
      optionRefs.current[nextIndex]?.focus();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commitHighlightedOption(highlightedIndex);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
    }
  };

  return (
    <>
      <div
        ref={cellRef}
        tabIndex={0}
        data-grid-id={gridId}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        className="w-full h-full min-h-[32px] flex items-center justify-center cursor-default outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:outline-offset-[-1px] focus:z-10"
        title="더블클릭하여 성별 선택"
      >
        <span className={`text-[12px] sm:text-[13px] font-black ${value ? 'text-slate-700 dark:text-slate-200' : 'text-gray-300 dark:text-gray-600'}`}>
          {value || '-'}
        </span>
      </div>

      {menuOpen && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={closeMenu}>
          <div
            className="absolute bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl p-2 flex gap-1.5"
            style={{ top: menuPos.y + 4, left: menuPos.x - 42 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleMenuKeyDown}
          >
            {OPTIONS.map((opt, index) => (
              <button
                key={opt}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                onClick={() => {
                  setHighlightedIndex(index);
                  commitHighlightedOption(index);
                }}
                onFocus={() => setHighlightedIndex(index)}
                className={`min-w-[34px] h-[30px] px-2 rounded-lg text-xs font-black border transition-colors ${value === opt
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-brand-400'} ${highlightedIndex === index ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-slate-800' : ''}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
