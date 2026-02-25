import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface PatientMemoModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMemo: string;
    onSave: (newMemo: string) => void;
    patientName?: string;
}

export const PatientMemoModal: React.FC<PatientMemoModalProps> = ({
    isOpen,
    onClose,
    initialMemo,
    onSave,
    patientName
}) => {
    const [memo, setMemo] = useState(initialMemo);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setMemo(initialMemo);
            // 포커스 이동을 약간 지연시켜 모달 렌더링 후 선택되도록 함
            setTimeout(() => {
                textareaRef.current?.focus();
                // 맨 뒤로 커서 이동
                textareaRef.current?.setSelectionRange(initialMemo.length, initialMemo.length);
            }, 50);
        }
    }, [isOpen, initialMemo]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(memo);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Cmd+Enter or Ctrl+Enter to save
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div
                className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {patientName ? `${patientName} 메모` : '환자 메모'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 min-w-[32px] min-h-[32px] rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-gray-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 flex-1">
                    <textarea
                        ref={textareaRef}
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="환자 특이사항, 주의해야 할 점을 남겨주세요."
                        className="w-full h-32 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg resize-none outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm text-slate-700 dark:text-slate-300 transition-shadow"
                    />
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-2 text-right w-full">
                        저장: Cmd+Enter 또는 Ctrl+Enter
                    </p>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2 bg-gray-50/50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-sm shadow-brand-200 dark:shadow-none transition-all focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
};
