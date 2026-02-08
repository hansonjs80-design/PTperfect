
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, List, Check, X } from 'lucide-react';
import { PatientVisit } from '../../types';
import { ContextMenu } from '../common/ContextMenu';
import { TreatmentTextRenderer } from './TreatmentTextRenderer';
import { TreatmentControlButtons } from './TreatmentControlButtons';

interface TreatmentSelectorCellProps {
  visit?: PatientVisit;
  value: string;
  placeholder?: string;
  rowStatus?: 'active' | 'completed' | 'none';
  onCommitText: (val: string) => void;
  onOpenSelector: () => void;
  directSelector?: boolean;
  activeStepColor?: string; // Color class for the active step text
  activeStepIndex?: number; // The index of the currently active step
  isLastStep?: boolean;
  onNextStep?: () => void; // Handler for next step button
  onPrevStep?: () => void; // Handler for prev step button
  onClearBed?: () => void; // Handler for clearing bed
}

export const TreatmentSelectorCell: React.FC<TreatmentSelectorCellProps> = ({ 
  visit,
  value, 
  placeholder,
  rowStatus = 'none',
  onCommitText, 
  onOpenSelector,
  directSelector = false,
  activeStepColor,
  activeStepIndex = -1,
  isLastStep = false,
  onNextStep,
  onPrevStep,
  onClearBed
}) => {
  const [mode, setMode] = useState<'view' | 'menu' | 'edit_text'>('view');
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  
  // Compact Popup State
  const [popupState, setPopupState] = useState<{ type: 'prev' | 'next' | 'clear', x: number, y: number } | null>(null);

  // Hover Tooltip State (Desktop Only)
  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, width: number } | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'edit_text' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
    }
  }, [mode]);

  const handleMouseEnter = () => {
    // Show tooltip only on Desktop (>= 1024px) and if there is a value
    if (value && window.matchMedia('(min-width: 1024px) and (hover: hover)').matches && cellRef.current) {
        const rect = cellRef.current.getBoundingClientRect();
        setHoverInfo({ 
            x: rect.left + (rect.width / 2), 
            y: rect.top - 8, // Slightly above
            width: rect.width
        });
    }
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  const executeInteraction = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setHoverInfo(null); // Clear tooltip on interaction

    // 1. Explicit direct selector override
    if (directSelector) {
        onOpenSelector();
        return;
    }

    // 2. Active Row -> Live Edit 
    if ((rowStatus as string) === 'active') {
        onOpenSelector();
        return;
    }

    // 3. Log Edit Mode
    // If the row has content (value exists) but is NOT active, treat as Log Edit Mode
    if (value && (rowStatus as string) !== 'active') {
        onOpenSelector();
        return;
    }
    
    // 4. Fallback -> Show Menu
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

  const handleStepButtonClick = (e: React.MouseEvent, type: 'prev' | 'next' | 'clear') => {
    e.stopPropagation();
    setHoverInfo(null);
    
    // Responsive Logic:
    // Desktop/Tablet (>= 768px): Immediate Action (One-click)
    // Mobile (< 768px): Show Popup Confirmation (Two-click safety)
    const isDesktopOrTablet = window.matchMedia('(min-width: 768px)').matches;

    if (isDesktopOrTablet) {
        // Execute immediately without popup
        if (type === 'next' && onNextStep) onNextStep();
        else if (type === 'prev' && onPrevStep) onPrevStep();
        else if (type === 'clear' && onClearBed) onClearBed();
    } else {
        // Mobile: Show Popup
        const x = e.clientX;
        const y = e.clientY;
        setPopupState({ type, x, y });
    }
  };

  const executeStepAction = () => {
    if (popupState?.type === 'next' && onNextStep) {
        onNextStep();
    } else if (popupState?.type === 'prev' && onPrevStep) {
        onPrevStep();
    } else if (popupState?.type === 'clear' && onClearBed) {
        onClearBed();
    }
    setPopupState(null);
  };

  const handleTextCommit = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
      const target = e.currentTarget;
      if (target.value !== value) {
          onCommitText(target.value);
      }
      setMode('view');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          inputRef.current?.blur(); 
      } else if (e.key === 'Escape') {
          setMode('view');
      }
  };

  const getTitle = () => {
      if (directSelector || (rowStatus as string) === 'active') return "클릭하여 처방 수정";
      if (value && (rowStatus as string) !== 'active') return "클릭하여 로그 수정 (배드 미작동)";
      return "클릭하여 수정 옵션 열기";
  };

  const getPopupMessage = () => {
      switch (popupState?.type) {
          case 'next': return isLastStep ? '치료를 완료할까요?' : '다음 단계로?';
          case 'prev': return '이전 단계로?';
          case 'clear': return '침상 비우시겠습니까?';
          default: return '';
      }
  };

  return (
    <>
        <div 
          ref={cellRef}
          className="relative w-full h-full"
          onClick={handleSingleClick}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
            {mode === 'edit_text' ? (
                <input
                    ref={inputRef}
                    type="text"
                    defaultValue={value}
                    onBlur={handleTextCommit}
                    onKeyDown={handleKeyDown}
                    className="w-full h-full bg-white dark:bg-slate-700 px-2 py-1 outline-none border-2 border-brand-500 rounded-sm text-xs sm:text-sm text-center !text-gray-900 dark:!text-gray-100"
                    placeholder={placeholder}
                />
            ) : (
                <div 
                    className="flex items-center w-full h-full cursor-pointer px-1 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors relative"
                    title={getTitle()}
                >
                    {/* Control Buttons (Left Side) */}
                    <TreatmentControlButtons 
                      rowStatus={rowStatus}
                      activeStepIndex={activeStepIndex}
                      isLastStep={isLastStep}
                      onNextStep={onNextStep}
                      onPrevStep={onPrevStep}
                      onClearBed={onClearBed}
                      onActionClick={handleStepButtonClick}
                    />

                    {/* Text Content */}
                    <div className="flex-1 min-w-0 flex justify-center pl-10 pr-2">
                         <span className="text-xs sm:text-sm xl:text-[11px] font-bold truncate pointer-events-none text-center w-full">
                             <TreatmentTextRenderer 
                               value={value}
                               placeholder={placeholder}
                               isActiveRow={rowStatus === 'active'}
                               activeStepIndex={activeStepIndex}
                               activeStepColor={activeStepColor}
                             />
                         </span>
                    </div>
                </div>
            )}
        </div>
        
        {/* Desktop Hover Tooltip (Full Content) */}
        {hoverInfo && createPortal(
            <div 
                className="fixed z-[9999] bg-[#f2f2f2] dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-150 max-w-sm border border-gray-200 dark:border-slate-700"
                style={{ 
                    top: hoverInfo.y, 
                    left: hoverInfo.x,
                    transform: 'translate(-50%, -100%)' 
                }}
            >
                <div className="text-xs font-bold text-center leading-relaxed">
                    <TreatmentTextRenderer 
                       value={value}
                       placeholder={placeholder}
                       isActiveRow={rowStatus === 'active'}
                       activeStepIndex={activeStepIndex}
                       activeStepColor={activeStepColor ? 'text-green-600 dark:text-green-300' : undefined} 
                    />
                </div>
                {/* Little arrow pointing down */}
                <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#f2f2f2] dark:bg-slate-800 rotate-45 transform border-b border-r border-gray-200 dark:border-slate-700"></div>
            </div>,
            document.body
        )}

        {/* Compact Confirmation Popup (Mobile Only) */}
        {popupState && createPortal(
            <div className="fixed inset-0 z-[9999]" onClick={() => setPopupState(null)}>
                <div 
                    className="absolute bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-600 p-2 animate-in zoom-in-95 duration-150 origin-bottom"
                    style={{ 
                        top: popupState.y - 70, // 70px above cursor
                        left: popupState.x - 70, // Centered (approx)
                        width: 140
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <p className="text-[10px] font-bold text-center text-gray-600 dark:text-gray-300 mb-1.5 whitespace-nowrap">
                        {getPopupMessage()}
                    </p>
                    <div className="flex gap-1">
                        <button 
                            onClick={executeStepAction}
                            className={`flex-1 py-1 text-white rounded text-[10px] font-bold flex items-center justify-center gap-0.5 ${
                                popupState.type === 'clear' || (popupState.type === 'next' && isLastStep) 
                                    ? 'bg-red-600 hover:bg-red-700' 
                                    : 'bg-brand-600 hover:bg-brand-700'
                            }`}
                        >
                            <Check className="w-3 h-3" /> 예
                        </button>
                        <button 
                            onClick={() => setPopupState(null)}
                            className="flex-1 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded text-[10px] font-bold hover:bg-gray-200 flex items-center justify-center gap-0.5"
                        >
                            <X className="w-3 h-3" /> 취소
                        </button>
                    </div>
                    <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white dark:bg-slate-800 border-b border-r border-gray-200 dark:border-slate-600 rotate-45 transform"></div>
                </div>
            </div>,
            document.body
        )}

        {mode === 'menu' && (
            <ContextMenu
                title="처방 목록 수정"
                position={menuPos}
                onClose={() => setMode('view')}
            >
                <button 
                    onClick={() => setMode('edit_text')}
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
                    onClick={() => {
                        onOpenSelector();
                        setMode('view');
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors text-left group"
                >
                    <div className="p-2 bg-brand-100 dark:bg-brand-900 rounded-full group-hover:bg-white dark:group-hover:bg-brand-800 shadow-sm">
                        <List className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                        <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">처방 변경 및 동기화</span>
                        <span className="block text-[10px] text-gray-500 dark:text-gray-400">프리셋 선택 & 배드 상태 반영</span>
                    </div>
                </button>
            </ContextMenu>
        )}
    </>
  );
};
