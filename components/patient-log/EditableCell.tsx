import React, { useState, useRef, useEffect, memo } from 'react';
import { flushSync } from 'react-dom';
import { Edit3, RefreshCw } from 'lucide-react';
import { ContextMenu } from '../common/ContextMenu';
import { useGridNavigation } from '../../hooks/useGridNavigation';

interface EditableCellProps {
  value: string | number | null;
  onCommit: (val: string, skipSync: boolean, navDirection?: 'down' | 'right' | 'left' | 'up') => void;
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
  suggestionOptions?: string[];
  koreanOnly?: boolean;
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
  suppressEnterNav = false,
  suggestionOptions = [],
  koreanOnly = false
}) => {
  const [mode, setMode] = useState<'view' | 'menu' | 'edit'>('view');
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [localValue, setLocalValue] = useState(value === null ? '' : String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const skipNextBlurCommitRef = useRef(false);
  const restoreSelectionAfterBlurRef = useRef(false);
  const shouldReplaceOnCompositionRef = useRef(false);

  const skipSyncRef = useRef(false);
  const navIntentRef = useRef<'down' | 'right' | 'left' | 'up' | null>(null);
  const isDirectEditing = directEdit && mode === 'edit';

  const { handleGridKeyDown } = useGridNavigation(11);

  const restoreGridSelectionFocus = () => {
    if (!gridId) return;

    queueMicrotask(() => {
      const cellElement = document.querySelector(`[data-grid-id="${gridId}"]`) as HTMLElement | null;
      if (!cellElement) return;
      cellElement.focus();
    });
  };

  const sanitizeInputValue = (raw: string) => {
    const upperCased = forceUpperCase ? raw.toUpperCase() : raw;
    if (!koreanOnly) return upperCased;
    return upperCased.replace(/[^\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3\s]/g, '');
  };

  const normalizeSuggestion = (text: string) => text.trim().normalize('NFD').toLocaleLowerCase();

  const findSuggestedValue = (rawValue: string) => {
    const normalized = normalizeSuggestion(rawValue);
    if (!normalized) return null;

    return suggestionOptions.find((option) => {
      const trimmed = option.trim();
      if (!trimmed) return false;
      if (trimmed === rawValue) return false;
      return normalizeSuggestion(trimmed).startsWith(normalized);
    }) || null;
  };
  const previewSuggestion = suggestionOptions.length > 0 && isDirectEditing
    ? findSuggestedValue(localValue)
    : null;
  const previewTail = previewSuggestion && previewSuggestion.length > localValue.length
    ? previewSuggestion.slice(localValue.length)
    : '';

  useEffect(() => {
    setLocalValue(value === null ? '' : String(value));
  }, [value, rowIndex]);

  const commitValue = (nextValue: string, navDirection?: 'down' | 'right' | 'left' | 'up') => {
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
      const clickedCaret = e.currentTarget.selectionStart ?? e.currentTarget.value.length;
      skipSyncRef.current = !syncOnDirectEdit;
      setMode('edit');
      setTimeout(() => {
        const input = inputRef.current;
        if (!input) return;

        input.focus();
        input.setSelectionRange(clickedCaret, clickedCaret);
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
    const nextValue = sanitizeInputValue(e.target.value);
    setLocalValue(nextValue);
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
    if (shouldReplaceOnCompositionRef.current) {
      shouldReplaceOnCompositionRef.current = false;
      setLocalValue('');
      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(0, 0);
      });
    }
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    const nextValue = sanitizeInputValue(e.currentTarget.value);
    setLocalValue(nextValue);
  };

  const handleBlur = () => {
    // 단축키로 모달이 열리는 도중 발생한 blur라면 (data-prevent-autofocus가 true)
    // 텍스트는 임시 유지(Hold)하고, 새 행이 DB에 곧바로 생성(Commit)되지 않도록 무시합니다.
    if (document.body.getAttribute('data-prevent-autofocus') === 'true') {
      return;
    }

    if (mode === 'edit') {
      setMode('view');
    }

    if (skipNextBlurCommitRef.current) {
      skipNextBlurCommitRef.current = false;
      navIntentRef.current = null;
      if (restoreSelectionAfterBlurRef.current) {
        restoreSelectionAfterBlurRef.current = false;
        restoreGridSelectionFocus();
      }
      return;
    }

    // 모달 여는 상황이 아니면 정상적으로 데이터 동기화(Commit)
    const finalValue = localValue;
    commitValue(finalValue, navIntentRef.current || undefined);
    navIntentRef.current = null;
    if (restoreSelectionAfterBlurRef.current) {
      restoreSelectionAfterBlurRef.current = false;
      restoreGridSelectionFocus();
    }
  };

  const handleCopy = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!isDirectEditing) return;
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const selected = start !== end ? input.value.slice(start, end) : localValue;

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

    const baseValue = localValue;
    const selected = baseValue.slice(cutStart, Math.min(cutEnd, baseValue.length));
    const next = `${baseValue.slice(0, cutStart)}${baseValue.slice(Math.min(cutEnd, baseValue.length))}`;

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
    const pasted = sanitizeInputValue(pastedRaw);

    const baseValue = localValue;
    const start = input.selectionStart ?? baseValue.length;
    const end = input.selectionEnd ?? baseValue.length;
    const next = `${baseValue.slice(0, start)}${pasted}${baseValue.slice(Math.min(end, baseValue.length))}`;

    setLocalValue(next);
    commitValue(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const nativeEvt = e.nativeEvent as KeyboardEvent & { keyCode?: number; which?: number };
    const isIMEKey = nativeEvt.isComposing || e.key === 'Process' || nativeEvt.keyCode === 229 || nativeEvt.which === 229;
    const isHangulLikeKey = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(e.key);

    if (directEdit && !isDirectEditing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (isIMEKey || isHangulLikeKey) {
        e.stopPropagation();
        skipSyncRef.current = !syncOnDirectEdit;
        navIntentRef.current = null;
        shouldReplaceOnCompositionRef.current = false;
        flushSync(() => {
          setMode('edit');
        });

        requestAnimationFrame(() => {
          inputRef.current?.focus();
          const end = inputRef.current?.value.length ?? String(value ?? '').length;
          inputRef.current?.setSelectionRange(end, end);
        });
        return;
      }

      const isPrintableKey = e.key.length === 1;

      if (isPrintableKey) {
        const nextValue = sanitizeInputValue(e.key);
        if (nextValue.length === 0) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        skipSyncRef.current = !syncOnDirectEdit;
        navIntentRef.current = null;
        shouldReplaceOnCompositionRef.current = false;
        flushSync(() => {
          setMode('edit');
          setLocalValue(nextValue);
        });

        requestAnimationFrame(() => {
          inputRef.current?.focus();
          const end = nextValue.length;
          inputRef.current?.setSelectionRange(end, end);
        });
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        skipSyncRef.current = !syncOnDirectEdit;
        navIntentRef.current = null;
        flushSync(() => {
          setMode('edit');
          setLocalValue('');
        });
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.setSelectionRange(0, 0);
        });
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
      skipSyncRef.current = !syncOnDirectEdit;
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

    if (e.key === 'Enter' && isDirectEditing && suggestionOptions.length > 0 && !e.nativeEvent.isComposing) {
      if (previewSuggestion) {
        e.preventDefault();
        e.stopPropagation();
        skipNextBlurCommitRef.current = true;
        restoreSelectionAfterBlurRef.current = true;
        setLocalValue(previewSuggestion);
        navIntentRef.current = null;
        commitValue(previewSuggestion);
        inputRef.current?.blur();
        return;
      }
    }

    if (e.key === 'Enter' && isDirectEditing && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.stopPropagation();
      navIntentRef.current = null;
      restoreSelectionAfterBlurRef.current = true;
      inputRef.current?.blur();
      return;
    }

    if (previewSuggestion && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.stopPropagation();
      const input = inputRef.current;
      if (input) {
        if (e.key === 'ArrowLeft') {
          input.setSelectionRange(0, 0);
        } else {
          const end = localValue.length;
          input.setSelectionRange(end, end);
        }
      }
      navIntentRef.current = null;
      handleGridKeyDown(e, rowIndex, colIndex, true, inputRef.current);
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

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        navIntentRef.current = 'up';
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
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    'data-grid-id': gridId,
    placeholder: placeholder,
    'data-direct-editing': isDirectEditing ? 'true' : 'false',
  };

  return (
    <>
      <div className="w-full h-full relative">
        {isDirectEditing && previewTail && (
          <div
            aria-hidden="true"
            className={`
              pointer-events-none absolute inset-[1px] px-2 py-0.5 rounded-[1px]
              flex items-center justify-center overflow-hidden text-sm
            `}
          >
            <div className={`max-w-full truncate whitespace-pre text-center ${className || ''}`}>
              <span className="text-gray-900 dark:text-gray-100">{localValue}</span>
              <span className="text-slate-400 dark:text-slate-500">{previewTail}</span>
            </div>
          </div>
        )}
        <input
          {...commonInputProps}
          autoFocus={mode === 'edit'}
          onClick={handleSingleClick}
          onDoubleClick={handleDoubleClick}
          readOnly={!directEdit ? !directEdit : false}
          className={`
            w-[calc(100%-2px)] h-[calc(100%-2px)] m-px px-2 py-0.5 flex items-center border-none outline-none rounded-[1px]
            ${mode === 'edit'
              ? 'bg-transparent text-center !text-gray-900 dark:!text-gray-100'
              : 'bg-transparent'}
            ${isDirectEditing && previewTail ? '!text-transparent caret-gray-900 dark:caret-gray-100 selection:bg-transparent selection:text-transparent' : ''}
            ${(directEdit && mode !== 'edit') ? 'cursor-default select-none caret-transparent' : 'cursor-pointer'} hover:bg-slate-200/55 dark:hover:bg-slate-700/70 transition-all duration-150 text-sm truncate group-hover:scale-[1.03] transform-gpu
            ${mode === 'edit'
              ? 'focus:outline-none focus:ring-0 focus:bg-transparent dark:focus:bg-transparent'
              : 'focus:outline focus:outline-2 focus:outline-sky-400 focus:outline-offset-[-1px] focus:z-10 focus:bg-transparent dark:focus:bg-transparent'}
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
