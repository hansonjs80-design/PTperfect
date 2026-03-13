
import React, { useState, useRef, memo } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { PatientVisit } from '../../types';
import { StatusSelectionMenu } from './StatusSelectionMenu';
import { useGridNavigation } from '../../hooks/useGridNavigation';

interface PatientStatusCellProps {
  visit?: PatientVisit;
  rowStatus?: 'active' | 'completed' | 'none';
  onUpdate: (id: string, updates: Partial<PatientVisit>, skipBedSync?: boolean) => void;
  isDraft?: boolean;
  onCreate?: (updates: Partial<PatientVisit>) => Promise<string>;
  gridId?: string;
  rowIndex: number;
  colIndex: number;
}

export const PatientStatusCell: React.FC<PatientStatusCellProps> = memo(({
  visit,
  rowStatus = 'none',
  onUpdate,
  isDraft,
  onCreate,
  gridId,
  rowIndex,
  colIndex
}) => {
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const lastClickTimeRef = useRef<number>(0);
  const { handleGridKeyDown } = useGridNavigation(11);

  const executeInteraction = (e: React.MouseEvent | React.KeyboardEvent, isKeyboard: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();

    if (isKeyboard && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom });
    } else {
      const mouseEvent = e as React.MouseEvent;
      setMenuPos({ x: mouseEvent.clientX, y: mouseEvent.clientY });
    }
  };

  // Unified click handler: Desktop (Single Click), Mobile (Manual Double Tap)
  const handleInteraction = (e: React.MouseEvent) => {
    // 1. Desktop & Tablet (Width >= 768px) -> Single Click
    if (window.innerWidth >= 768) {
      executeInteraction(e);
      return;
    }

    // 2. Mobile (Width < 768px) -> Manual Double Tap Detection
    // Native onDoubleClick is unreliable on mobile due to zoom/delay/viewport handling
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeInteraction(e, true);
    } else {
      handleGridKeyDown(e, rowIndex, colIndex);
    }
  };

  const toggleStatus = async (key: keyof PatientVisit) => {
    const currentVal = visit ? !!visit[key] : false;
    const newVal = !currentVal;

    if (isDraft && onCreate) {
      await onCreate({ [key]: newVal });
    } else if (visit) {
      // 활성 행은 배드 상태 아이콘과 연동, 그 외 행은 로그 전용
      const skipSync = rowStatus !== 'active';
      onUpdate(visit.id, { [key]: newVal }, skipSync);
    }
  };

  const menuTitle = rowStatus === 'active' ? "추가 사항 변경 (배드 연동)" : "추가 사항 변경 (단순 기록)";

  const hasActiveStatus = visit && (
    visit.is_injection ||
    visit.is_fluid ||
    visit.is_manual ||
    visit.is_eswt ||
    visit.is_traction ||
    visit.is_ion ||
    visit.is_exercise
  );

  const statusPills = [
    { active: !!visit?.is_injection, label: '주사', bg: 'bg-red-500' },
    { active: !!visit?.is_fluid, label: '수액', bg: 'bg-cyan-500' },
    { active: !!visit?.is_manual, label: '도수', bg: 'bg-violet-500' },
    { active: !!visit?.is_eswt, label: '충격파', bg: 'bg-blue-500' },
    { active: !!visit?.is_traction, label: '견인', bg: 'bg-orange-500' },
    { active: !!visit?.is_ion, label: '이온', bg: 'bg-emerald-500' },
    { active: !!visit?.is_exercise, label: '운동', bg: 'bg-lime-500' },
  ].filter((item) => item.active);

  // Helper for title (tooltip)
  const getTitle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return `더블탭하여 추가 사항 변경 (${rowStatus === 'active' ? '배드 연동' : '로그만 수정'})`;
    }
    return `클릭하여 추가 사항 변경 (${rowStatus === 'active' ? '배드 연동' : '로그만 수정'})`;
  };

  return (
    <>
      <div
        ref={cellRef}
        className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:outline-offset-[-1px] focus:z-10"
        onClick={handleInteraction}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        data-grid-id={gridId}
        title={getTitle()}
      >
        {hasActiveStatus ? (
          <div className="w-full h-full px-1 py-0.5 flex items-center justify-center">
            <div className="flex flex-wrap items-center justify-center gap-1 max-w-full">
              {statusPills.map((item) => (
                <span key={item.label} className={`px-1.5 py-0.5 rounded-md text-[10px] font-black text-white ${item.bg}`}>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="opacity-0 group-hover:opacity-50 transition-opacity">
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      {menuPos && (
        <StatusSelectionMenu
          visit={visit}
          position={menuPos}
          onClose={() => {
            setMenuPos(null);
            setTimeout(() => cellRef.current?.focus(), 0);
          }}
          onToggle={toggleStatus}
          title={menuTitle}
        />
      )}
    </>
  );
});
