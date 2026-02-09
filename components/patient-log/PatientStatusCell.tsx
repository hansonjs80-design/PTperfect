
import React, { useState, useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { PatientVisit } from '../../types';
import { PatientStatusIcons } from './PatientStatusIcons';
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

export const PatientStatusCell: React.FC<PatientStatusCellProps> = ({ 
  visit, 
  rowStatus = 'none',
  onUpdate,
  isDraft,
  onCreate,
  gridId,
  rowIndex,
  colIndex
}) => {
  const [menuPos, setMenuPos] = useState<{x: number, y: number} | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const { handleGridKeyDown } = useGridNavigation(8);

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

  const handleSingleClick = (e: React.MouseEvent) => {
    if (window.innerWidth >= 768) {
      executeInteraction(e);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (window.innerWidth < 768) {
      executeInteraction(e);
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
        const skipSync = rowStatus !== 'active';
        onUpdate(visit.id, { [key]: newVal }, skipSync);
    }
    // Don't close menu immediately to allow multiple toggles, user clicks elsewhere to close
  };

  const menuTitle = rowStatus === 'active' ? "상태 변경 (배드 연동)" : "상태 변경 (단순 기록)";

  const hasActiveStatus = visit && (
      visit.is_injection || 
      visit.is_fluid || 
      visit.is_manual || 
      visit.is_eswt || 
      visit.is_traction
  );

  return (
    <>
        <div 
            ref={cellRef}
            className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group outline-none focus:ring-2 focus:ring-sky-400 focus:z-10"
            onClick={handleSingleClick}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            data-grid-id={gridId}
            title={`클릭하여 상태 변경 (${rowStatus === 'active' ? '배드 연동' : '로그만 수정'})`}
        >
            {hasActiveStatus ? (
                <PatientStatusIcons visit={visit!} />
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
};
