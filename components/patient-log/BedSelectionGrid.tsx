
import React from 'react';

interface BedSelectionGridProps {
  currentValue: number | null;
  activeBedIds: number[];
  onSelect: (bedId: number) => void;
  disableHighlight?: boolean;
}

export const BedSelectionGrid: React.FC<BedSelectionGridProps> = ({
  currentValue,
  activeBedIds,
  onSelect,
  disableHighlight = false
}) => {
  const bedNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  return (
    <div className="grid grid-cols-5 gap-1.5 p-2">
      {bedNumbers.map((num) => {
        // If disableHighlight is true, we force isActive to false so no gray background is rendered
        const isActive = !disableHighlight && activeBedIds.includes(num);
        const isSelected = currentValue === num;
        
        // Style Logic:
        // 1. Selected: Blue
        // 2. Active (Busy): Gray (Ignored if disableHighlight is true)
        // 3. Default: White
        let btnClass = "h-8 flex items-center justify-center rounded-lg font-black text-xs sm:text-sm border transition-all active:scale-95 ";
        
        if (isSelected) {
            btnClass += "bg-brand-600 text-white border-brand-700 shadow-inner cursor-default opacity-50";
        } else if (isActive) {
            btnClass += "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-500 hover:bg-slate-300 dark:hover:bg-slate-500";
        } else {
            btnClass += "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-600 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200";
        }

        return (
          <button
            key={num}
            onClick={() => onSelect(num)}
            className={btnClass}
            disabled={isSelected}
            title={isActive ? "현재 사용 중인 배드" : (disableHighlight ? "배드 번호 수정 (로그)" : "빈 배드")}
          >
            {num === 11 ? 'T' : num}
          </button>
        );
      })}
    </div>
  );
};
