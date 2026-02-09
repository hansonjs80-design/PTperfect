
import React, { useState, useRef, useEffect } from 'react';
import { Edit3, RefreshCw } from 'lucide-react';
import { ContextMenu } from '../common/ContextMenu';
import { useGridNavigation } from '../../hooks/useGridNavigation';

interface EditableCellProps {
  value: string | number | null;
  onCommit: (val: string, skipSync: boolean, navDirection?: 'down' | 'right' | 'left') => void;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
  menuTitle?: string;
  directEdit?: boolean;
  syncOnDirectEdit?: boolean;
  gridId?: string;
  rowIndex: number;
  colIndex: number;
  suppressEnterNav?: boolean; 
}

export const EditableCell: React.FC<EditableCellProps> = ({ 
  value, 
  onCommit, 
  type = 'text', 
  placeholder, 
  className,
  menuTitle = '수정 옵션',
  directEdit = false,
  syncOnDirectEdit = true,
  gridId,
  rowIndex,
  colIndex,
  suppressEnterNav = false
}) => {
  const [mode, setMode] = useState<'view' | 'menu' | 'edit'>('view');
  const [skipSync, setSkipSync] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [localValue, setLocalValue] = useState(value === null ? '' : String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Ref to track navigation intent during blur
  const navIntentRef = useRef<'down' | 'right' | 'left' | null>(null);
  
  const { handleGridKeyDown } = useGridNavigation(8);

  useEffect(() => {
    setLocalValue(value === null ? '' : String(value));
  }, [value, rowIndex]);

  const executeInteraction = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (directEdit) {
      setSkipSync(!syncOnDirectEdit); 
      setMode('edit');
      return;
    }
    
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMode('menu');
  };

  const handleSingleClick = (e: React.MouseEvent) => {
    if (window.innerWidth >= 768) {
      executeInteraction(e);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (window.innerWidth < 768) {
      executeInteraction(e);
    }
  };

  const handleOptionClick = (shouldSkipSync: boolean) => {
    setSkipSync(shouldSkipSync);
    setMode('edit');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    if (mode === 'edit') {
      setMode('view');
    }
    
    // Commit if value changed OR if we have a specific nav intent (to trigger creation on Enter/Tab/Arrows)
    if (localValue !== String(value || '') || navIntentRef.current) {
      onCommit(localValue, skipSync, navIntentRef.current || undefined);
    }
    navIntentRef.current = null; // Reset intent
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 1. Handle Escape (Local Cancel)
    if (e.key === 'Escape') {
      e.stopPropagation();
      setLocalValue(value === null ? '' : String(value));
      navIntentRef.current = null;
      inputRef.current?.blur();
      return;
    }

    // 2. Special handling for Draft rows (suppressEnterNav=true)
    if (suppressEnterNav) {
        if (e.nativeEvent.isComposing) return;

        // Vertical: Enter or ArrowDown -> Create Row & Move Down
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            navIntentRef.current = 'down';
            inputRef.current?.blur(); 
            return;
        }
        
        // Right: Tab (no shift) or ArrowRight (at end)
        if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'ArrowRight') {
            // For ArrowRight, ensure cursor is at end
            if (e.key === 'ArrowRight' && inputRef.current) {
                if (inputRef.current.selectionEnd !== inputRef.current.value.length) return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            navIntentRef.current = 'right';
            inputRef.current?.blur(); 
            return;
        }

        // Left: Shift+Tab or ArrowLeft (at start)
        if ((e.key === 'Tab' && e.shiftKey) || e.key === 'ArrowLeft') {
             // For ArrowLeft, ensure cursor is at start
             if (e.key === 'ArrowLeft' && inputRef.current) {
                 if (inputRef.current.selectionStart !== 0) return;
             }

             e.preventDefault();
             e.stopPropagation();
             navIntentRef.current = 'left';
             inputRef.current?.blur();
             return;
        }
    }
    
    // 3. Delegate Navigation (Tab, Arrows, or Enter on normal rows) to Hook
    handleGridKeyDown(e, rowIndex, colIndex, true, inputRef.current);
  };

  const commonInputProps = {
    ref: inputRef,
    type: type,
    value: localValue,
    onChange: handleChange,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    "data-grid-id": gridId,
    placeholder: placeholder,
  };

  if (mode === 'edit') {
    return (
      <input
        {...commonInputProps}
        autoFocus
        className={`w-full h-full bg-white dark:bg-slate-700 px-2 py-1 outline-none border-2 border-brand-500 rounded-sm text-sm text-center !text-gray-900 dark:!text-gray-100 ${className} focus:ring-2 focus:ring-sky-400 focus:outline-none focus:z-10`}
      />
    );
  }

  return (
    <>
      <div className="w-full h-full relative">
        <input
          {...commonInputProps}
          onClick={handleSingleClick}
          onDoubleClick={handleDoubleClick}
          className={`
            w-full h-full px-2 py-1 flex items-center bg-transparent border-none outline-none
            cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-sm truncate 
            focus:ring-2 focus:ring-sky-400 focus:z-10 focus:bg-white dark:focus:bg-slate-800
            ${!localValue ? 'placeholder-gray-300 italic' : ''} ${className}
          `}
          title={directEdit ? "클릭하여 수정" : "클릭하여 옵션 열기"}
        />
      </div>
      
      {mode === 'menu' && (
        <ContextMenu
          title={menuTitle}
          position={menuPos}
          onClose={() => setMode('view')}
        >
            <button 
                onClick={() => handleOptionClick(true)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left group"
            >
                <div className="p-2 bg-gray-100 dark:bg-slate-600 rounded-full group-hover:bg-white dark:group-hover:bg-slate-500 shadow-sm">
                    <Edit3 className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                </div>
                <div>
                    <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">단순 텍스트 수정</span>
                    <span className="block text-[10px] text-gray-500 dark:text-gray-400">로그만 변경 (배드 미작동)</span>
                </div>
            </button>

            <button 
                onClick={() => handleOptionClick(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors text-left group"
            >
                <div className="p-2 bg-brand-100 dark:bg-brand-900 rounded-full group-hover:bg-white dark:group-hover:bg-brand-800 shadow-sm">
                    <RefreshCw className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">배드 적용 수정</span>
                    <span className="block text-[10px] text-gray-500 dark:text-gray-400">변경 사항 배드 동기화</span>
                </div>
            </button>
        </ContextMenu>
      )}
    </>
  );
};
