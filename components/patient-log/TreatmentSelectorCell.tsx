import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, List, Check, X, Plus, Trash2 } from 'lucide-react';
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
    activeStepBgColor?: string;
    activeStepIndex?: number;
    isLastStep?: boolean;
    timerStatus?: 'normal' | 'warning' | 'overtime';
    remainingTime?: number;
    isPaused?: boolean;
    onNextStep?: () => void;
    onPrevStep?: () => void;
    onClearBed?: () => void;
    gridId?: string;
    rowIndex: number;
    colIndex: number;
    isReadOnly?: boolean;
}

const parseSteps = (raw: string): string[] => raw.split('/').map((v) => v.trim()).filter(Boolean);

export const TreatmentSelectorCell: React.FC<TreatmentSelectorCellProps> = ({
    value,
    placeholder,
    rowStatus = 'none',
    onCommitText,
    onOpenSelector,
    directSelector = false,
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
    gridId,
    rowIndex,
    colIndex,
    isReadOnly = false
}) => {
    const [mode, setMode] = useState<'view' | 'menu' | 'edit_text'>('view');
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const [popupState, setPopupState] = useState<{ type: 'prev' | 'next' | 'clear', x: number, y: number } | null>(null);
    const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number } | null>(null);
    const [quickEditPos, setQuickEditPos] = useState<{ x: number, y: number } | null>(null);
    const [quickSteps, setQuickSteps] = useState<string[]>([]);
    const [newStepText, setNewStepText] = useState('');

    const cellRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastClickTimeRef = useRef<number>(0);

    const { handleGridKeyDown } = useGridNavigation(9);

    const hasTreatment = useMemo(() => value.trim() !== '', [value]);

    useEffect(() => {
        if (mode === 'edit_text' && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }
    }, [mode]);

    const handleMouseEnter = () => {
        if (value && window.matchMedia('(min-width: 1024px) and (hover: hover)').matches && cellRef.current) {
            const rect = cellRef.current.getBoundingClientRect();
            setHoverInfo({ x: rect.left + (rect.width / 2), y: rect.top - 8 });
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

        if (isReadOnly) {
            // 타이머 사용 중에는 배드 활성화/동기화 경로는 막고 텍스트 수정 메뉴만 허용
            setMode('menu');
            return;
        }

        if (directSelector) { onOpenSelector(); return; }
        if ((rowStatus as string) === 'active') { onOpenSelector(); return; }
        if (value && (rowStatus as string) !== 'active') { onOpenSelector(); return; }
        setMode('menu');
    };

    const openQuickEditAt = (x: number, y: number) => {
        if (!hasTreatment || isReadOnly) return;
        setQuickSteps(parseSteps(value));
        setNewStepText('');
        setQuickEditPos({ x, y });
    };

    const openQuickEditPopup = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openQuickEditAt(e.clientX, e.clientY);
    };

    const removeStep = (idx: number) => {
        setQuickSteps((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateStepText = (idx: number, nextText: string) => {
        setQuickSteps((prev) => prev.map((step, i) => (i === idx ? nextText : step)));
    };

    const addStep = () => {
        const trimmed = newStepText.trim();
        if (!trimmed) return;
        setQuickSteps((prev) => [...prev, trimmed]);
        setNewStepText('');
    };

    const applyQuickEdit = () => {
        const joined = quickSteps.join(' / ');
        onCommitText(joined);
        setQuickEditPos(null);
    };

    const handleInteraction = (e: React.MouseEvent) => {
        if (window.innerWidth >= 1024) {
            executeInteraction(e);
            return;
        }

        const now = Date.now();
        const timeDiff = now - lastClickTimeRef.current;

        if (timeDiff < 350 && timeDiff > 0) {
            const isTouchLike = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024;

            if (isTouchLike && hasTreatment && !isReadOnly) {
                e.preventDefault();
                e.stopPropagation();
                openQuickEditAt(e.clientX, e.clientY);
            } else {
                executeInteraction(e);
            }

            lastClickTimeRef.current = 0;
        } else {
            lastClickTimeRef.current = now;
        }
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

    const getPopupMessage = () => {
        switch (popupState?.type) {
            case 'prev': return '이전 단계로?';
            case 'next': return isLastStep ? '치료 완료/비우기?' : '다음 단계로?';
            case 'clear': return '배드 비우기?';
            default: return '';
        }
    };

    const getTitle = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            return "더블탭하여 수정";
        }
        if (isReadOnly) {
            return "타이머 사용 중: 텍스트 수정만 가능 (활성화/동기화는 잠금)";
        }
        return value ? "클릭: 선택기 / 우클릭: 빠른 편집" : "클릭하여 처방 선택";
    };

    return (
        <>
            <div
                ref={cellRef}
                tabIndex={0}
                data-grid-id={gridId}
                onClick={handleInteraction}
                onDoubleClick={(e) => e.preventDefault()}
                onContextMenu={openQuickEditPopup}
                onKeyDown={handleKeyDown}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="w-full h-full min-h-[36px] relative outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:outline-offset-[-1px] focus:z-10"
            >
                {mode === 'edit_text' ? (
                    <input
                        ref={inputRef}
                        type="text"
                        defaultValue={value}
                        onBlur={handleTextCommit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTextCommit(e);
                            if (e.key === 'Escape') { setMode('view'); setTimeout(() => cellRef.current?.focus(), 0); }
                        }}
                        className="w-full h-full bg-white dark:bg-slate-800 border-2 border-brand-500 rounded-sm text-sm sm:text-base text-left pl-3 !text-gray-900 dark:!text-gray-100"
                        placeholder={placeholder}
                    />
                ) : (
                    <div className={`flex items-center w-full h-full px-1 transition-colors relative ${isReadOnly ? 'cursor-not-allowed bg-gray-50/80 dark:bg-slate-800/40' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30'}`} title={getTitle()}>
                        <div className="flex-1 min-w-0 flex items-center justify-start pl-2 pr-14">
                            <span className="text-[15.4px] sm:text-[17.6px] xl:text-[15.4px] font-bold truncate pointer-events-none text-left w-full leading-tight text-slate-900 dark:text-slate-100">
                                <TreatmentTextRenderer value={value} placeholder={placeholder} isActiveRow={rowStatus === 'active'} activeStepIndex={activeStepIndex} activeStepColor={activeStepColor} activeStepBgColor={activeStepBgColor} timerStatus={timerStatus} remainingTime={remainingTime} isPaused={isPaused} />
                            </span>
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
                )}
            </div>

            {hoverInfo && createPortal(
                <div className="fixed z-[9999] bg-[#f2f2f2] dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-150 max-w-sm border border-gray-200 dark:border-slate-700" style={{ top: hoverInfo.y, left: hoverInfo.x, transform: 'translate(-50%, -100%)' }}>
                    <div className="text-sm font-semibold text-left leading-relaxed max-w-[420px] whitespace-pre-wrap">
                        {value || placeholder}
                    </div>
                    <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#f2f2f2] dark:bg-slate-800 rotate-45 transform border-b border-r border-gray-200 dark:border-slate-700"></div>
                </div>, document.body
            )}

            {quickEditPos && createPortal(
                <div className="fixed inset-0 z-[9999]" onClick={() => setQuickEditPos(null)}>
                    <div
                        className="absolute w-[360px] max-w-[92vw] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-2xl p-3"
                        style={{ top: Math.max(8, quickEditPos.y - 20), left: Math.max(8, quickEditPos.x - 140) }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100 mb-2">처방 목록 수정</p>
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">수정</span>
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">삭제</span>
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">추가</span>
                        </div>
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                            {quickSteps.length === 0 && <p className="text-xs text-gray-400">처방 목록이 없습니다.</p>}
                            {quickSteps.map((step, idx) => (
                                <div key={`${step}-${idx}`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 bg-slate-50/70 dark:bg-slate-900/30">
                                    <span className="text-[12px] font-black text-slate-500 dark:text-slate-300">{idx + 1}.</span>
                                    <input
                                        value={step}
                                        onChange={(e) => updateStepText(idx, e.target.value)}
                                        className="flex-1 px-2 py-1 text-[13px] font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                                    />
                                    <button type="button" onClick={() => removeStep(idx)} className="p-1 rounded hover:bg-red-50 text-red-500" title="삭제"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-2 flex gap-1.5">
                            <input
                                value={newStepText}
                                onChange={(e) => setNewStepText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addStep(); }}
                                placeholder="추가할 처방명 입력"
                                className="flex-1 px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                            />
                            <button type="button" onClick={addStep} className="px-2 py-1.5 rounded bg-brand-600 text-white text-xs font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> 추가</button>
                        </div>

                        <div className="mt-3 flex gap-2">
                            <button type="button" onClick={applyQuickEdit} className="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black">적용</button>
                            <button type="button" onClick={() => { onOpenSelector(); setQuickEditPos(null); }} className="flex-1 py-2 rounded bg-brand-600 hover:bg-brand-700 text-white text-xs font-black">상세 편집기</button>
                        </div>
                    </div>
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
                    <button
                        onClick={() => {
                            onOpenSelector();
                            setMode('view');
                            setTimeout(() => cellRef.current?.focus(), 0);
                        }}
                        className="flex items-center gap-3 p-3 rounded-lg transition-colors text-left group hover:bg-brand-50 dark:hover:bg-brand-900/20"
                    >
                        <div className="p-2 rounded-full shadow-sm bg-brand-100 dark:bg-brand-900 group-hover:bg-white dark:group-hover:bg-brand-800"><List className="w-4 h-4 text-brand-600 dark:text-brand-400" /></div>
                        <div>
                            <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">세트 처방으로 변경</span>
                            <span className="block text-[10px] text-gray-500 dark:text-gray-400">활성 타이머 영향 없이 처방 목록 텍스트만 교체</span>
                        </div>
                    </button>
                </ContextMenu>
            )}
        </>
    );
};
