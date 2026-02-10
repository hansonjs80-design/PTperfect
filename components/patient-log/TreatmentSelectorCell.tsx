
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, List, Check, X } from 'lucide-react';
import { PatientVisit } from '../../types';
import { ContextMenu } from '../common/ContextMenu';
import { TreatmentTextRenderer } from './TreatmentTextRenderer';
import { TreatmentControlButtons } from './TreatmentControlButtons';
import { useGridNavigation } from '../../hooks/useGridNavigation';

interface TreatmentSelectorCellProps {
  visit?: PatientVisit;
  value: string;
  placeholder?: string;
  rowStatus?: 'active' | 'completed' | 'none';
  onCommitText: (val: string) => void;
  onOpenSelector: () => void;
  directSelector?: boolean;
  activeStepColor?: string;
  activeStepIndex?: number;
  isLastStep?: boolean;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  onClearBed?: () => void;
  gridId?: string;
  rowIndex: number;
  colIndex: number;
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
  onClearBed,
  gridId,
  rowIndex,
  colIndex
}) => {
  const [mode, setMode] = useState<'view' | 'menu' | 'edit_text'>('view');
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [popupState, setPopupState] = useState<{ type: 'prev' | 'next' | 'clear', x: number, y: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, width: number } | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { handleGridKeyDown } = useGridNavigation(8);

  useEffect(() => {
    if (mode === 'edit_text' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
    }
  }, [mode]);

  const handleMouseEnter = () => {
    if (value && window.matchMedia('(min-width: 1024px) and (hover: hover)').matches && cellRef.current) {
        const rect = cellRef.current.getBoundingClientRect();
        setHoverInfo({ x: rect.left + (rect.width / 2), y: rect.top - 8, width: rect.width });
    }
  };

  const handleMouseLeave = () => setHoverInfo(null);

  const executeInteraction = (e: React.MouseEvent | React.KeyboardEvent, isKeyboard: boolean = false) => {
    e.stopPropagation();
    e.preventDefault();
    setHoverInfo(null);

    if (isKeyboard && cellRef.current) {
        const rect = cellRef.current.getBoundingClientRect();
        setMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom });
    } else {
        const mouseEvent = e as React.MouseEvent;
        setMenuPos({ x: mouseEvent.clientX, y: mouseEvent.clientY });
    }

    if (directSelector) { onOpenSelector(); return; }
    if ((rowStatus as string) === 'active') { onOpenSelector(); return; }
    if (value && (rowStatus as string) !== 'active') { onOpenSelector(); return; }
    setMode('menu');
  };

  const handleSingleClick = (e: React.MouseEvent) => {
    if (window.innerWidth >= 768) executeInteraction(e);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (window.innerWidth < 768) executeInteraction(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        executeInteraction(e, true);
    } else {
        handleGridKeyDown(e, rowIndex, colIndex);
    }
  };

  const handleStepButtonClick = (e: React.MouseEvent, type: 'prev' | 'next' | 'clear') => {
    e.stopPropagation();
    setHoverInfo(null);
    
    const isDesktopOrTablet = window.matchMedia('(min-width: 768px)').matches;

    if (isDesktopOrTablet) {
        if (type === 'next' && onNextStep) onNextStep();
        else if (type === 'prev' && onPrevStep) onPrevStep();
        else if (type === 'clear' && onClearBed) onClearBed();
    } else {
        const x = e.clientX;
        const y = e.clientY;
        setPopupState({ type, x, y });
    }
  };

  const executeStepAction = () => {
    if (popupState?.type === 'next' && onNextStep) onNextStep();
    else if (popupState?.type === 'prev' && onPrevStep) onPrevStep();
    else if (popupState?.type === 'clear' && onClearBed) onClearBed();
    setPopupState(null);
  };

  const handleTextCommit = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
      const target = e.currentTarget;
      if (target.value !== value) onCommitText(target.value);
      setMode('view');
      setTimeout(() => cellRef.current?.focus(), 0);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') inputRef.current?.blur(); 
      else if (e.key === 'Escape') setMode('view');
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
          className="relative w-full h-full focus:ring-2 focus:ring-sky-400 focus:outline-none focus:z-10"
          onClick={handleSingleClick}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          data-grid-id={gridId}
        >
            {mode === 'edit_text' ? (
                <input
                    ref={inputRef}
                    type="text"
                    defaultValue={value}
                    onBlur={handleTextCommit}
                    onKeyDown={handleInputKeyDown}
                    className="w-full h-full bg-white dark:bg-slate-700 px-2 py-1 outline-none border-2 border-brand-500 rounded-sm text-xs sm:text-sm text-center !text-gray-900 dark:!text-gray-100"
                    placeholder={placeholder}
                />
            ) : (
                <div className="flex items-center w-full h-full cursor-pointer px-1 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors relative" title={getTitle()}>
                    <TreatmentControlButtons 
                      rowStatus={rowStatus}
                      activeStepIndex={activeStepIndex}
                      isLastStep={isLastStep}
                      onNextStep={onNextStep}
                      onPrevStep={onPrevStep}
                      onClearBed={onClearBed}
                      onActionClick={handleStepButtonClick}
                    />
                    {/* Increased padding from pl-10 to pl-14 to fit larger buttons */}
                    <div className="flex-1 min-w-0 flex justify-center pl-14 pr-2">
                         <span className="text-xs sm:text-sm xl:text-[11px] font-bold truncate pointer-events-none text-center w-full">
                             <TreatmentTextRenderer value={value} placeholder={placeholder} isActiveRow={rowStatus === 'active'} activeStepIndex={activeStepIndex} activeStepColor={activeStepColor} />
                         </span>
                    </div>
                </div>
            )}
        </div>
        
        {hoverInfo && createPortal(
            <div className="fixed z-[9999] bg-[#f2f2f2] dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-150 max-w-sm border border-gray-200 dark:border-slate-700" style={{ top: hoverInfo.y, left: hoverInfo.x, transform: 'translate(-50%, -100%)' }}>
                <div className="text-xs font-bold text-center leading-relaxed">
                    <TreatmentTextRenderer value={value} placeholder={placeholder} isActiveRow={rowStatus === 'active'} activeStepIndex={activeStepIndex} activeStepColor={activeStepColor ? 'text-green-600 dark:text-green-300' : undefined} />
                </div>
                <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#f2f2f2] dark:bg-slate-800 rotate-45 transform border-b border-r border-gray-200 dark:border-slate-700"></div>
            </div>, document.body
        )}

        {popupState && createPortal(
            <div className="fixed inset-0 z-[9999]" onClick={() => setPopupState(null)}>
                <div className="absolute bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-600 p-2 animate-in zoom-in-95 duration-150 origin-bottom" style={{ top: popupState.y - 70, left: popupState.x - 70, width: 140 }} onClick={(e) => e.stopPropagation()}>
                    <p className="text-[10px] font-bold text-center text-gray-600 dark:text-gray-300 mb-1.5 whitespace-nowrap">{getPopupMessage()}</p>
                    <div className="flex gap-1">
                        <button onClick={executeStepAction} className={`flex-1 py-1 text-white rounded text-[10px] font-bold flex items-center justify-center gap-0.5 ${popupState.type === 'clear' || (popupState.type === 'next' && isLastStep) ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'}`}><Check className="w-3 h-3" /> 예</button>
                        <button onClick={() => setPopupState(null)} className="flex-1 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded text-[10px] font-bold hover:bg-gray-200 flex items-center justify-center gap-0.5"><X className="w-3 h-3" /> 취소</button>
                    </div>
                    <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white dark:bg-slate-800 border-b border-r border-gray-200 dark:border-slate-600 rotate-45 transform"></div>
                </div>
            </div>, document.body
        )}

        {mode === 'menu' && (
            <ContextMenu title="처방 목록 수정" position={menuPos} onClose={() => setMode('view')}>
                <button onClick={() => setMode('edit_text')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left group">
                    <div className="p-2 bg-gray-100 dark:bg-slate-600 rounded-full group-hover:bg-white dark:group-hover:bg-slate-500 shadow-sm"><Edit3 className="w-4 h-4 text-gray-500 dark:text-gray-300" /></div>
                    <div><span className="block text-sm font-bold text-gray-800 dark:text-gray-200">단순 텍스트 수정</span><span className="block text-[10px] text-gray-500 dark:text-gray-400">로그만 변경 (배드 미작동)</span></div>
                </button>
                <button onClick={() => { onOpenSelector(); setMode('view'); setTimeout(() => cellRef.current?.focus(), 0); }} className="flex items-center gap-3 p-3 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors text-left group">
                    <div className="p-2 bg-brand-100 dark:bg-brand-900 rounded-full group-hover:bg-white dark:group-hover:bg-brand-800 shadow-sm"><List className="w-4 h-4 text-brand-600 dark:text-brand-400" /></div>
                    <div><span className="block text-sm font-bold text-gray-800 dark:text-gray-200">처방 변경 및 동기화</span><span className="block text-[10px] text-gray-500 dark:text-gray-400">프리셋 선택 & 배드 상태 반영</span></div>
                </button>
            </ContextMenu>
        )}
    </>
  );
};
