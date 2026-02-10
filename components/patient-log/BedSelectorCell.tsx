
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, PlayCircle, Hash, Check, X } from 'lucide-react';
import { ContextMenu } from '../common/ContextMenu';
import { BedSelectionGrid } from './BedSelectionGrid';
import { useGridNavigation } from '../../hooks/useGridNavigation';

interface BedSelectorCellProps {
  value: number | null;
  onMove: (newBedId: number) => void;
  onAssign: (newBedId: number) => void;
  className?: string;
  onUpdateLogOnly?: (newBedId: number) => void; 
  rowStatus?: 'active' | 'completed' | 'none';
  hasTreatment?: boolean;
  activeBedIds?: number[];
  isLogEditMode?: boolean;
  gridId?: string;
  rowIndex: number;
  colIndex: number;
}

export const BedSelectorCell: React.FC<BedSelectorCellProps> = ({ 
  value, 
  onMove, 
  onAssign,
  className,
  onUpdateLogOnly,
  rowStatus = 'none',
  hasTreatment = true,
  activeBedIds = [],
  isLogEditMode = false,
  gridId,
  rowIndex,
  colIndex
}) => {
  const [mode, setMode] = useState<'view' | 'menu' | 'edit_log' | 'edit_assign' | 'select_target'>('view');
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [activeConfirmPos, setActiveConfirmPos] = useState<{x: number, y: number} | null>(null);
  const [gridPos, setGridPos] = useState<{top: number, left: number} | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const lastClickTimeRef = useRef<number>(0);

  const { handleGridKeyDown } = useGridNavigation(8);

  useEffect(() => {
    if ((mode === 'edit_log' || mode === 'edit_assign') && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [mode]);

  useLayoutEffect(() => {
    if (mode === 'select_target' && gridRef.current) {
      const width = gridRef.current.offsetWidth || 230;
      const height = gridRef.current.offsetHeight || 180;
      const smartPos = getSmartPosition(menuPos, width, height);
      setGridPos({ top: smartPos.top || 0, left: smartPos.left || 0 });
    }
  }, [mode, menuPos]);

  const getSmartPosition = (pos: {x: number, y: number}, w: number = 160, h: number = 80) => {
      if (!pos) return {};
      const GAP = 10;
      let left = pos.x - (w / 2);
      let top = pos.y - h - GAP; 
      const screenW = window.innerWidth;
      if (left + w > screenW - GAP) left = screenW - w - GAP;
      if (left < GAP) left = GAP;
      if (top < GAP) top = pos.y + GAP + 20; 
      return { top, left, width: w };
  };

  const executeInteraction = (e: React.MouseEvent | React.KeyboardEvent, isKeyboard: boolean = false) => {
    e.stopPropagation();
    e.preventDefault();

    let clickPos = { x: 0, y: 0 };
    
    if (isKeyboard && cellRef.current) {
        const rect = cellRef.current.getBoundingClientRect();
        clickPos = { x: rect.left + rect.width / 2, y: rect.bottom };
    } else {
        const mouseEvent = e as React.MouseEvent;
        clickPos = { x: mouseEvent.clientX, y: mouseEvent.clientY };
    }
    
    setMenuPos(clickPos);

    if (isLogEditMode) {
        setMode('select_target');
        return;
    }
    if (!value) {
        setMode('select_target');
        return;
    }
    if (!hasTreatment) {
        setMode('select_target');
        return;
    }
    if (rowStatus === 'active') {
        if (window.innerWidth >= 768) {
            setActiveConfirmPos(clickPos);
        } else {
            // Mobile uses native confirm for better UX in this specific dangerous action
            if (window.confirm("방번호를 변경하시겠습니까?")) {
                setMode('select_target');
            }
        }
        return;
    }
    setMode('menu');
  };

  // Unified interaction handler: Single Click (Desktop) vs Double Tap (Mobile)
  const handleInteraction = (e: React.MouseEvent) => {
    // 1. Desktop & Tablet (Width >= 768px) -> Single Click
    if (window.innerWidth >= 768) {
      executeInteraction(e);
      return;
    }

    // 2. Mobile (Width < 768px) -> Manual Double Tap Detection
    const now = Date.now();
    const timeDiff = now - lastClickTimeRef.current;

    if (timeDiff < 350 && timeDiff > 0) {
      // Double tap detected
      executeInteraction(e);
      lastClickTimeRef.current = 0; // Reset
    } else {
      // First tap
      lastClickTimeRef.current = now;
    }
  };

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        executeInteraction(e, true);
    } else {
        handleGridKeyDown(e, rowIndex, colIndex);
    }
  };

  const handleCommit = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
      if (mode === 'view' || mode === 'menu' || mode === 'select_target') return;
      const target = e.currentTarget;
      const newVal = parseInt(target.value);
      if (!isNaN(newVal) && newVal > 0) {
          if (mode === 'edit_log' && onUpdateLogOnly) {
              onUpdateLogOnly(newVal);
          } else if (mode === 'edit_assign') {
              if (value && newVal !== value) {
                  onMove(newVal);
              } else if (!value) {
                  onAssign(newVal);
              }
          }
      }
      setMode('view');
      // Return focus to cell after edit
      setTimeout(() => cellRef.current?.focus(), 0);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleCommit(e);
      else if (e.key === 'Escape') setMode('view');
  };

  const handleGridSelect = (num: number) => {
    if (isLogEditMode || (mode === 'edit_log' && onUpdateLogOnly)) {
        if (onUpdateLogOnly) onUpdateLogOnly(num);
    } else {
        if (value && num !== value) {
            onMove(num);
        } else if (!value || value !== num) {
            onAssign(num);
        }
    }
    setMode('view');
    // Return focus to cell after selection
    setTimeout(() => cellRef.current?.focus(), 0);
  };

  const renderContent = () => {
    if (mode === 'select_target') {
        return createPortal(
            <div className="fixed inset-0 z-[9999] bg-transparent" onClick={() => setMode('view')}>
                <div
                    ref={gridRef}
                    className="absolute bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col w-[230px]"
                    style={{ top: gridPos ? gridPos.top : '-9999px', left: gridPos ? gridPos.left : '-9999px', opacity: gridPos ? 1 : 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-2.5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 shrink-0">
                        <span className="font-bold text-gray-800 dark:text-white text-xs truncate">{isLogEditMode ? "방 번호 수정 (단순 변경)" : "배드 선택 (회색: 사용중)"}</span>
                        <button onClick={() => setMode('view')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-1">
                        <BedSelectionGrid currentValue={value} activeBedIds={activeBedIds} onSelect={handleGridSelect} disableHighlight={isLogEditMode} />
                    </div>
                </div>
            </div>, document.body
        );
    }
    if (mode === 'edit_log' || mode === 'edit_assign') {
        return (
            <ContextMenu title={mode === 'edit_log' ? '단순 표기 수정' : '배드 배정/이동'} position={menuPos} onClose={() => setMode('view')}>
                <div className="p-2">
                    <div className="flex items-center gap-2 border-2 border-brand-500 rounded-lg p-1 focus-within:ring-2 focus-within:ring-brand-200 transition-all">
                        <Hash className="w-5 h-5 text-gray-400 ml-1" />
                        <input ref={inputRef} type="number" defaultValue={value || ''} onBlur={handleCommit} onKeyDown={handleInputKeyDown} className="w-full text-lg font-bold bg-transparent outline-none p-1 text-gray-900 dark:text-white" placeholder="번호 입력..." />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">엔터(Enter)를 누르면 저장됩니다.</p>
                </div>
            </ContextMenu>
        );
    }
    if (mode === 'menu') {
        return (
            <ContextMenu title={`방 번호 수정 (현재: ${value === 11 ? 'T' : value || '-'})`} position={menuPos} onClose={() => setMode('view')}>
                <button onClick={() => setMode('select_target')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors text-left group">
                    <div className="p-2 bg-brand-100 dark:bg-brand-900 rounded-full group-hover:bg-white dark:group-hover:bg-brand-800 shadow-sm"><PlayCircle className="w-4 h-4 text-brand-600 dark:text-brand-400" /></div>
                    <div><span className="block text-sm font-bold text-gray-800 dark:text-gray-200">배드 선택 (이동/배정)</span><span className="block text-[10px] text-gray-500 dark:text-gray-400">목록에서 번호 선택</span></div>
                </button>
                <button onClick={() => setMode('edit_log')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left group">
                    <div className="p-2 bg-gray-100 dark:bg-slate-600 rounded-full group-hover:bg-white dark:group-hover:bg-slate-500 shadow-sm"><Edit3 className="w-4 h-4 text-gray-500 dark:text-gray-300" /></div>
                    <div><span className="block text-sm font-bold text-gray-800 dark:text-gray-200">단순 수정 (텍스트)</span><span className="block text-[10px] text-gray-500 dark:text-gray-400">로그만 변경 (배드 미작동)</span></div>
                </button>
            </ContextMenu>
        );
    }
    return null;
  };

  const getTitle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return "더블탭하여 수정";
    }
    return !value ? "클릭하여 배드 선택" : (rowStatus === 'active' ? "클릭하여 방번호 변경" : "클릭하여 수정/배정 메뉴 열기");
  };

  return (
    <>
        <div 
            ref={cellRef}
            onClick={handleInteraction}
            onKeyDown={handleContainerKeyDown}
            tabIndex={0}
            data-grid-id={gridId}
            className={`w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors group select-none outline-none focus:ring-2 focus:ring-sky-400 focus:outline-none focus:z-10 ${className}`}
            title={getTitle()}
        >
            {value ? (
                <span className={`text-lg sm:text-xl xl:text-sm font-black group-hover:scale-110 transition-transform ${value === 11 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {value === 11 ? 'T' : value}
                </span>
            ) : (
                <span className="text-gray-300 dark:text-gray-600 text-sm xl:text-[12px] font-bold">-</span>
            )}
        </div>
        
        {renderContent()}

        {activeConfirmPos && createPortal(
            <div className="fixed inset-0 z-[9999]" onClick={() => setActiveConfirmPos(null)}>
                <div 
                    ref={popupRef}
                    className="absolute bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-600 p-2.5 animate-in zoom-in-95 duration-150 flex flex-col gap-2"
                    style={getSmartPosition(activeConfirmPos)}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-center">
                        <p className="text-[11px] font-bold text-gray-800 dark:text-white leading-tight">방번호를 변경하시겠습니까?</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">현재 치료 중인 배드입니다.</p>
                    </div>
                    <div className="flex gap-1.5">
                        <button onClick={(e) => { setMenuPos({ x: e.clientX, y: e.clientY }); setActiveConfirmPos(null); setMode('select_target'); }} className="flex-1 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition-colors"><Check className="w-3 h-3" /> 예</button>
                        <button onClick={() => setActiveConfirmPos(null)} className="flex-1 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"><X className="w-3 h-3" /> 아니오</button>
                    </div>
                </div>
            </div>, document.body
        )}
    </>
  );
};
