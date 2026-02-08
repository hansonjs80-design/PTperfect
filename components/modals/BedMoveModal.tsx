
import React, { useState, useRef, useLayoutEffect, memo } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { useTreatmentContext } from '../../contexts/TreatmentContext';
import { BedSelectionGrid } from '../patient-log/BedSelectionGrid';

interface BedMoveModalProps {
  fromBedId: number | null;
  initialPos: { x: number, y: number };
  onClose: () => void;
  onConfirm: (toBedId: number) => void;
}

export const BedMoveModal: React.FC<BedMoveModalProps> = memo(({ fromBedId, initialPos, onClose, onConfirm }) => {
  const { beds } = useTreatmentContext();
  const [pos, setPos] = useState(initialPos);
  const modalRef = useRef<HTMLDivElement>(null);

  // 현재 사용 중인 배드 목록 추출 (본인 제외)
  const activeBedIds = beds
    .filter(b => b.status === 'ACTIVE' && b.id !== fromBedId)
    .map(b => b.id);

  // Smart Positioning
  useLayoutEffect(() => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      
      let newX = initialPos.x;
      let newY = initialPos.y;

      if (newX + rect.width > screenW) {
        newX = screenW - rect.width - 10;
      }
      if (newX < 10) newX = 10;

      if (newY + rect.height > screenH) {
        newY = initialPos.y - rect.height - 10;
      }
      if (newY < 10) newY = 10;

      setPos({ x: newX, y: newY });
    }
  }, [initialPos]);

  if (fromBedId === null) return null;

  const handleSelect = (toBedId: number) => {
    if (toBedId === fromBedId) return;
    // Context의 movePatient 로직에서 이미 사용중인 배드에 대한 confirm 처리가 되어 있으므로
    // 여기서는 단순히 ID만 넘깁니다.
    onConfirm(toBedId);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-transparent"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="absolute w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-600 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-left"
        style={{ top: pos.y, left: pos.x }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-100 dark:bg-brand-900/30 rounded-md text-brand-600 dark:text-brand-400">
                <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
            <div>
               <span className="text-[10px] font-bold text-gray-400 block leading-none mb-0.5">FROM BED {fromBedId}</span>
               <h3 className="font-bold text-sm text-gray-800 dark:text-white leading-none">이동할 침상 선택</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: Grid Selection */}
        <div className="p-2">
           <BedSelectionGrid 
             currentValue={fromBedId}
             activeBedIds={activeBedIds}
             onSelect={handleSelect}
           />
           <div className="px-2 pb-2 pt-1">
             <p className="text-[10px] text-gray-400 text-center leading-tight">
               * 회색은 사용 중인 배드입니다.<br/>선택 시 내용을 덮어씁니다.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
});
