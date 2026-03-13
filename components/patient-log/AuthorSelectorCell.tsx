
import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Settings } from 'lucide-react';
import { useGridNavigation } from '../../hooks/useGridNavigation';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { computePopupPosition } from '../../utils/popupUtils';

const DEFAULT_AUTHORS = ['K', 'J', 'M', 'L'];

interface AuthorSelectorCellProps {
  gridId?: string;
  rowIndex: number;
  colIndex: number;
  value: string;
  onSelect: (val: string) => void;
  isDraft?: boolean;
}

export const AuthorSelectorCell: React.FC<AuthorSelectorCellProps> = ({
  gridId,
  rowIndex,
  colIndex,
  value,
  onSelect,
  isDraft = false
}) => {
  const [authorOptions, setAuthorOptions] = useLocalStorage<string[]>('physio-author-options', DEFAULT_AUTHORS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClickPos, setMenuClickPos] = useState({ x: 0, y: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [newOption, setNewOption] = useState('');

  const cellRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const lastClickTimeRef = useRef<number>(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const { handleGridKeyDown } = useGridNavigation(11);

  // Refine dropdown position with actual measured dimensions
  useLayoutEffect(() => {
    if (menuOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const refined = computePopupPosition(menuClickPos, rect.width, rect.height, { centerOnClick: true, gap: 4 });
      setDropdownPos(refined);
    }
  }, [menuOpen, menuClickPos, isEditMode, authorOptions.length]);

  const openMenu = (e: React.MouseEvent | React.KeyboardEvent, isKeyboard = false) => {
    e.preventDefault();
    e.stopPropagation();

    let clickPos: { x: number; y: number };
    if (isKeyboard && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      clickPos = { x: rect.left + rect.width / 2, y: rect.bottom };
    } else {
      const me = e as React.MouseEvent;
      clickPos = { x: me.clientX, y: me.clientY };
    }
    setMenuClickPos(clickPos);
    setIsEditMode(false);
    // Pre-compute initial position (estimated height ~200px)
    setDropdownPos(computePopupPosition(clickPos, 180, 200, { centerOnClick: true, gap: 4 }));
    setMenuOpen(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (window.innerWidth >= 768) {
      openMenu(e);
      return;
    }
    const now = Date.now();
    if (now - lastClickTimeRef.current < 350 && now - lastClickTimeRef.current > 0) {
      openMenu(e);
      lastClickTimeRef.current = 0;
    } else {
      lastClickTimeRef.current = now;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      openMenu(e, true);
    } else {
      handleGridKeyDown(e, rowIndex, colIndex);
    }
  };

  const handleOptionSelect = (option: string) => {
    const newVal = value === option ? '' : option;
    onSelect(newVal);
    closeMenu();
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim().toUpperCase();
    if (trimmed && !authorOptions.includes(trimmed)) {
      setAuthorOptions([...authorOptions, trimmed]);
    }
    setNewOption('');
    setTimeout(() => newInputRef.current?.focus(), 50);
  };

  const handleRemoveOption = (opt: string) => {
    setAuthorOptions(authorOptions.filter(o => o !== opt));
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setIsEditMode(false);
    setNewOption('');
    setTimeout(() => cellRef.current?.focus(), 0);
  };

  return (
    <>
      <div
        ref={cellRef}
        className={`w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:outline-offset-[-1px] focus:z-10 ${isDraft ? 'opacity-50 hover:opacity-100' : ''}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        data-grid-id={gridId}
        title="클릭하여 작성자 선택"
      >
        {value ? (
          <span className="text-sm xl:text-base font-bold text-gray-600 dark:text-gray-300">{value}</span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600 text-sm font-bold">-</span>
        )}
      </div>

      {menuOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-transparent" onClick={closeMenu}>
          <div
            ref={dropdownRef}
            className="absolute bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
            style={{
              top: dropdownPos?.top ?? 0,
              left: dropdownPos?.left ?? 0,
              width: 180
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 shrink-0">
              <span className="font-bold text-gray-800 dark:text-white text-xs truncate">
                {isEditMode ? '목록 편집' : '작성자 선택'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`p-1 rounded transition-colors ${isEditMode ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                  title="목록 편집"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button onClick={closeMenu} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="p-2 flex flex-col gap-1">
              {!isEditMode ? (
                <>
                  {/* Selection Mode */}
                  <div className="flex flex-wrap gap-1.5 justify-center py-1">
                    {authorOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleOptionSelect(opt)}
                        className={`
                          min-w-[36px] h-[36px] px-2 rounded-lg text-sm font-black transition-all duration-150 active:scale-95
                          ${value === opt
                            ? 'bg-brand-600 text-white shadow-md ring-2 ring-brand-300 dark:ring-brand-700'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }
                        `}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {/* Clear button */}
                  {value && (
                    <button
                      onClick={() => handleOptionSelect(value)}
                      className="mt-1 w-full py-1.5 rounded-lg border border-red-200 bg-red-50 text-[11px] font-bold text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/35 transition-colors"
                    >
                      선택 해제
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* Edit Mode */}
                  <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
                    {authorOptions.map((opt) => (
                      <div
                        key={opt}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-700/50"
                      >
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{opt}</span>
                        <button
                          onClick={() => handleRemoveOption(opt)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new option */}
                  <div className="flex items-center gap-1 mt-1 border-t border-gray-100 dark:border-slate-700 pt-2">
                    <input
                      ref={newInputRef}
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      placeholder="추가..."
                      maxLength={4}
                      className="flex-1 text-sm font-bold text-center bg-gray-50 dark:bg-slate-700 rounded-lg px-2 py-1.5 outline-none border border-gray-200 dark:border-slate-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-gray-800 dark:text-white placeholder-gray-400"
                    />
                    <button
                      onClick={handleAddOption}
                      disabled={!newOption.trim()}
                      className="p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="추가"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
