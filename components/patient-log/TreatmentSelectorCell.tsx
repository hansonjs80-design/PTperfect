import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { PatientVisit } from '../../types';
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
  activeStepBgColor?: string;
  activeStepIndex?: number;
  isLastStep?: boolean;
  timerStatus?: 'normal' | 'warning' | 'overtime';
  remainingTime?: number;
  isPaused?: boolean;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  onClearBed?: () => void;
  onTogglePause?: () => void;
  gridId?: string;
  rowIndex: number;
  colIndex: number;
  isReadOnly?: boolean;
}

export const TreatmentSelectorCell: React.FC<TreatmentSelectorCellProps> = ({
  value,
  placeholder,
  rowStatus = 'none',
  onOpenSelector,
  activeStepColor,
  activeStepBgColor,
  activeStepIndex = -1,
  isLastStep = false,
  timerStatus = 'normal',
  remainingTime,
  isPaused,
  onNextStep,
  onPrevStep,
  onClearBed,
  onTogglePause,
  gridId,
  rowIndex,
  colIndex,
  isReadOnly = false
}) => {
  const cellRef = useRef<HTMLDivElement>(null);
  const [popupState, setPopupState] = useState<{ type: 'prev' | 'next' | 'clear'; x: number; y: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number } | null>(null);
  const { handleGridKeyDown } = useGridNavigation(10);

  const handleMouseEnter = () => {
    if (value && window.matchMedia('(min-width: 1024px) and (hover: hover)').matches && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setHoverInfo({ x: rect.left + (rect.width / 2), y: rect.top - 8 });
    }
  };

  const handleMouseLeave = () => setHoverInfo(null);

  const openSelector = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setHoverInfo(null);
    // 처방 셀 클릭/탭 시 바로 세트 처방 목록 창으로 진입
    onOpenSelector();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      openSelector(e);
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
      setPopupState({ type, x: e.clientX, y: e.clientY });
    }
  };

  const executeStepAction = () => {
    if (popupState?.type === 'next' && onNextStep) onNextStep();
    else if (popupState?.type === 'prev' && onPrevStep) onPrevStep();
    else if (popupState?.type === 'clear' && onClearBed) onClearBed();
    setPopupState(null);
  };

  const getPopupMessage = () => {
    switch (popupState?.type) {
      case 'prev':
        return '이전 단계로?';
      case 'next':
        return isLastStep ? '치료 완료/비우기?' : '다음 단계로?';
      case 'clear':
        return '배드 비우기?';
      default:
        return '';
    }
  };

  const getTitle = () => (value ? '클릭하여 세트 처방 선택' : '클릭하여 처방 선택');

  return (
    <>
      <div
        ref={cellRef}
        tabIndex={0}
        data-grid-id={gridId}
        onClick={openSelector}
        onDoubleClick={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full min-h-[36px] relative outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:outline-offset-[-1px] focus:z-10"
      >
        <div
          className={`flex items-center w-full h-full px-2 transition-colors relative ${isReadOnly ? 'cursor-not-allowed bg-gray-50/80 dark:bg-slate-800/40' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30'} rounded-sm`}
          title={getTitle()}
        >
          <div className="flex-1 min-w-0 h-full flex items-center justify-start pl-2 pr-14 py-0.5">
            <div className="text-[15px] sm:text-[16px] xl:text-[15px] font-semibold pointer-events-none text-left w-full leading-normal text-slate-900 dark:text-slate-100 flex items-center min-h-[32px]">
              <TreatmentTextRenderer
                value={value}
                placeholder={placeholder}
                isActiveRow={rowStatus === 'active'}
                activeStepIndex={activeStepIndex}
                activeStepColor={activeStepColor}
                activeStepBgColor={activeStepBgColor}
                timerStatus={timerStatus}
                remainingTime={remainingTime}
                isPaused={isPaused}
                onTogglePause={onTogglePause}
              />
            </div>
          </div>

          {isReadOnly && (
            <span className="absolute top-1 right-2 rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-200">
              타이머 사용
            </span>
          )}

          {!isReadOnly && (
            <TreatmentControlButtons
              rowStatus={rowStatus}
              activeStepIndex={activeStepIndex}
              isLastStep={isLastStep}
              onNextStep={onNextStep}
              onPrevStep={onPrevStep}
              onClearBed={onClearBed}
              onActionClick={handleStepButtonClick}
            />
          )}
        </div>
      </div>

      {hoverInfo && createPortal(
        <div
          className="fixed z-[9999] bg-[#f2f2f2] dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-150 max-w-sm border border-gray-200 dark:border-slate-700"
          style={{ top: hoverInfo.y, left: hoverInfo.x, transform: 'translate(-50%, -100%)' }}
        >
          <div className="text-sm font-semibold text-left leading-relaxed max-w-[420px] whitespace-pre-wrap">{value || placeholder}</div>
          <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#f2f2f2] dark:bg-slate-800 rotate-45 transform border-b border-r border-gray-200 dark:border-slate-700"></div>
        </div>,
        document.body
      )}

      {popupState && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setPopupState(null)}>
          <div
            className="absolute bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-600 p-2 animate-in zoom-in-95 duration-150 origin-bottom"
            style={{ top: popupState.y - 70, left: popupState.x - 70, width: 140 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold text-center text-gray-600 dark:text-gray-300 mb-1.5 whitespace-nowrap">{getPopupMessage()}</p>
            <div className="flex gap-1">
              <button
                onClick={executeStepAction}
                className={`flex-1 py-1 text-white rounded text-[10px] font-bold flex items-center justify-center gap-0.5 ${popupState.type === 'clear' || (popupState.type === 'next' && isLastStep) ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'}`}
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
    </>
  );
};
