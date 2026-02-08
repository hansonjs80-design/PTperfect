
import React, { useState, useRef, useEffect } from 'react';
import { Edit3, RefreshCw } from 'lucide-react';
import { ContextMenu } from '../common/ContextMenu';

interface EditableCellProps {
  value: string | number | null;
  onCommit: (val: string, skipSync: boolean) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
  menuTitle?: string;
  directEdit?: boolean;
  syncOnDirectEdit?: boolean; // New prop to control sync behavior on direct edit
}

export const EditableCell: React.FC<EditableCellProps> = ({ 
  value, 
  onCommit, 
  type = 'text', 
  placeholder, 
  className,
  menuTitle = '수정 옵션',
  directEdit = false,
  syncOnDirectEdit = true // Default to syncing (updating bed display) unless specified otherwise
}) => {
  const [mode, setMode] = useState<'view' | 'menu' | 'edit'>('view');
  const [skipSync, setSkipSync] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [localValue, setLocalValue] = useState(value === null ? '' : String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'edit') {
      setLocalValue(value === null ? '' : String(value));
      if (inputRef.current) {
        inputRef.current.focus();
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [mode, value]);

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
    // Desktop/Tablet (>= 768px): Single Click triggers action
    if (window.innerWidth >= 768) {
      executeInteraction(e);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Mobile (< 768px): Double Click triggers action
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
      if (localValue !== String(value || '')) {
        onCommit(localValue, skipSync);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setMode('view');
    }
  };

  if (mode === 'edit') {
    return (
      <input
        ref={inputRef}
        type={type}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full h-full bg-white dark:bg-slate-700 px-2 py-1 outline-none border-2 border-brand-500 rounded-sm text-sm text-center !text-gray-900 dark:!text-gray-100 ${className}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <>
      <div 
        onClick={handleSingleClick}
        onDoubleClick={handleDoubleClick}
        className={`w-full h-full px-2 py-1 flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-sm truncate ${!value ? 'text-gray-300 italic' : ''} ${className}`}
        title={directEdit ? "클릭하여 수정" : "클릭하여 옵션 열기"}
      >
        {value || placeholder}
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
