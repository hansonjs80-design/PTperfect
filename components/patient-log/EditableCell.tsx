import React, { useState, useRef, useEffect, memo } from 'react';
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
  forceUpperCase?: boolean;
  gridId?: string;
  rowIndex: number;
  colIndex: number;
  suppressEnterNav?: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = memo(({
  value,
  onCommit,
  type = 'text',
  placeholder,
  className,
  menuTitle = '수정 옵션',
  directEdit = false,
  syncOnDirectEdit = true,
  forceUpperCase = false,
  gridId,
  rowIndex,
  colIndex,
  suppressEnterNav = false
}) => {
  const [mode, setMode] = useState<'view' | 'menu' | 'edit'>('view');
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [localValue, setLocalValue] = useState(value === null ? '' : String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const skipSyncRef = useRef(false);
  const navIntentRef = useRef<'down' | 'right' | 'left' | null>(null);
  const isDirectEditing = directEdit && mode === 'edit';

  const { handleGridKeyDown } = useGridNavigation(10);

  useEffect(() => {
    setLocalValue(value === null ? '' : String(value));
  }, [value, rowIndex]);

  const commitValue = (nextValue: string, navDirection?: 'down' | 'right' | 'left') => {
    if (nextValue !== String(value || '') || navDirection) {
      onCommit(nextValue, skipSyncRef.current, navDirection);
    }
  };

  const executeInteraction = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setMenuPos({ x: e.clientX, y: e.clientY });
    setMode('menu');
  };

  const handleSingleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (directEdit) {
      e.stopPropagation();
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    if (window.innerWidth >= 768) {
      executeInteraction(e);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (directEdit) {
      e.stopPropagation();
      e.preventDefault();
      setMode('edit');
      setTimeout(() => {
        const input = inputRef.current;
        if (!input) return;

        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }, 0);
      return;
    }

    if (window.innerWidth < 768) {
      executeInteraction(e);
    }
  };

  const handleFocus = () => {
    if (isDirectEditing) {
      skipSyncRef.current = !syncOnDirectEdit;
    }
  };

  const handleOptionClick = (shouldSkipSync: boolean) => {
    skipSyncRef.current = shouldSkipSync;
    setMode('edit');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(forceUpperCase ? e.target.value.toUpperCase() : e.target.value);
  };

  const handleBlur = () => {
    if (mode === 'edit') {
      setMode('view');
    }

    commitValue(localValue, navIntentRef.current || undefined);
    navIntentRef.current = null;
  };

  const handleCopy = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!isDirectEditing) return;
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const selected = start !== end ? input.value.slice(start, end) : input.value;

    e.preventDefault();
    e.clipboardData.setData('text/plain', selected);
    try {
      await navigator.clipboard?.writeText(selected);
    } catch {
      // ignore
    }
  };

  const handleCut = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!isDirectEditing) return;
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const cutStart = start === end ? 0 : start;
    const cutEnd = start === end ? input.value.length : end;

    const selected = input.value.slice(cutStart, cutEnd);
    const next = `${input.value.slice(0, cutStart)}${input.value.slice(cutEnd)}`;

    e.preventDefault();
    e.clipboardData.setData('text/plain', selected);

    try {
      await navigator.clipboard?.writeText(selected);
    } catch {
      // ignore
    }

    setLocalValue(next);
    commitValue(next);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!isDirectEditing) return;
    const input = inputRef.current;
    if (!input) return;

    const pastedRaw = e.clipboardData.getData('text/plain');
    if (pastedRaw === '') return;

    e.preventDefault();
    const pasted = forceUpperCase ? pastedRaw.toUpperCase() : pastedRaw;

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const next = `${input.value.slice(0, start)}${pasted}${input.value.slice(end)}`;

    setLocalValue(next);
    commitValue(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const nativeEvt = e.nativeEvent as KeyboardEvent & { keyCode?: number; which?: number };
    const isIMEKey = nativeEvt.isComposing || e.key === 'Process' || nativeEvt.keyCode === 229 || nativeEvt.which === 229;

    if (directEdit && !isDirectEditing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const isPrintableKey = e.key.length === 1 || isIMEKey;

      if (isPrintableKey) {
        skipSyncRef.current = !syncOnDirectEdit;
        navIntentRef.current = null;
        setMode('edit');

        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        skipSyncRef.current = !syncOnDirectEdit;
        navIntentRef.current = null;
        setMode('edit');
        setLocalValue('');
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.setSelectionRange(0, 0);
        }, 0);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && isDirectEditing) {
      e.preventDefault();
      inputRef.current?.select();
      return;
    }

    if (e.key === 'Enter' && directEdit && !isDirectEditing) {
      e.preventDefault();
      setMode('edit');
      return;
    }

    if (e.key === 'Escape') {
      e.stopPropagation();
      setLocalValue(value === null ? '' : String(value));
      navIntentRef.current = null;
      inputRef.current?.blur();
      return;
    }

    if (suppressEnterNav) {
      if (e.nativeEvent.isComposing) return;

      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        navIntentRef.current = 'down';
        inputRef.current?.blur();
        return;
      }

      if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'ArrowRight') {
        if (e.key === 'ArrowRight' && inputRef.current) {
          if (inputRef.current.selectionEnd !== inputRef.current.value.length) return;
        }

        e.preventDefault();
        e.stopPropagation();
        navIntentRef.current = 'right';
        inputRef.current?.blur();
        return;
      }

      if ((e.key === 'Tab' && e.shiftKey) || e.key === 'ArrowLeft') {
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

    handleGridKeyDown(e, rowIndex, colIndex, true, inputRef.current);
  };

  const commonInputProps = {
    ref: inputRef,
    type: type,
    value: localValue,
    onChange: handleChange,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    onFocus: handleFocus,
    onCopy: handleCopy,
    onCut: handleCut,
    onPaste: handlePaste,
    'data-grid-id': gridId,
    placeholder: placeholder,
  };

  return (
    <>
      <div className="w-full h-full relative">
        <input
          {...commonInputProps}
          autoFocus={mode === 'edit'}
          onClick={handleSingleClick}
          onDoubleClick={handleDoubleClick}
          readOnly={directEdit ? !isDirectEditing : !directEdit}
          className={`
            w-full h-full px-2 py-1 flex items-center border-none outline-none
            ${mode === 'edit'
              ? 'bg-white dark:bg-slate-700 border-2 border-brand-500 rounded-sm text-center !text-gray-900 dark:!text-gray-100'
              : 'bg-transparent'}
            ${(directEdit && mode !== 'edit') ? 'cursor-default select-none caret-transparent' : 'cursor-pointer'} hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-sm truncate
            focus:outline focus:outline-2 focus:outline-sky-400 focus:outline-offset-[-1px] focus:z-10 ${mode === 'edit' ? '' : 'focus:bg-white dark:focus:bg-slate-800'}
            ${!localValue ? 'placeholder-gray-300 italic' : ''} ${className}
          `}
          title={directEdit ? '클릭: 셀 선택 / 더블클릭: 수정' : '클릭하여 옵션 열기'}
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
});
