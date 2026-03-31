
import React, { useEffect, useState, useRef, memo } from 'react';
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
  disableBedSync?: boolean;
}

export const PatientStatusCell: React.FC<PatientStatusCellProps> = memo(({
  visit,
  rowStatus = 'none',
  onUpdate,
  isDraft,
  onCreate,
  gridId,
  rowIndex,
  colIndex,
  disableBedSync = false
}) => {
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [selectedStatusKey, setSelectedStatusKey] = useState<keyof PatientVisit | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const lastClickTimeRef = useRef<number>(0);
  const targetVisitIdRef = useRef<string | null>(visit?.id ?? null);
  const { handleGridKeyDown } = useGridNavigation(11);

  useEffect(() => {
    if (visit?.id) {
      targetVisitIdRef.current = visit.id;
    }
  }, [visit?.id]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (menuPos) {
      document.body.dataset.patientStatusMenuOpen = 'true';
      return () => {
        delete document.body.dataset.patientStatusMenuOpen;
      };
    }

    delete document.body.dataset.patientStatusMenuOpen;
    return undefined;
  }, [menuPos]);

  const executeInteraction = (e: React.MouseEvent | React.KeyboardEvent | React.TouchEvent, isKeyboard: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    targetVisitIdRef.current = visit?.id ?? null;

    if (isKeyboard && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom });
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      setMenuPos({ x: touch.clientX, y: touch.clientY });
    } else {
      const mouseEvent = e as React.MouseEvent;
      setMenuPos({ x: mouseEvent.clientX, y: mouseEvent.clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    cellRef.current?.focus();

    const now = Date.now();
    const timeDiff = now - lastClickTimeRef.current;

    if (timeDiff < 350 && timeDiff > 0) {
      executeInteraction(e);
      lastClickTimeRef.current = 0;
    } else {
      lastClickTimeRef.current = now;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeInteraction(e, true);
      return;
    }

    if ((e.key === 'Backspace' || e.key === 'Delete') && selectedStatusKey) {
      e.preventDefault();
      e.stopPropagation();
      void toggleStatus(selectedStatusKey);
      setSelectedStatusKey(null);
      return;
    }

    handleGridKeyDown(e, rowIndex, colIndex);
  };

  const toggleStatus = async (key: keyof PatientVisit) => {
    const currentVal = visit ? !!visit[key] : false;
    const newVal = !currentVal;
    const targetVisitId = targetVisitIdRef.current;

    if (targetVisitId) {
      // 활성 행은 배드 상태 아이콘과 연동, 그 외 행은 로그 전용
      const skipSync = disableBedSync || rowStatus !== 'active';
      onUpdate(targetVisitId, { [key]: newVal }, skipSync);
      return;
    }

    if (isDraft && onCreate) {
      const createdId = await onCreate({ [key]: newVal });
      targetVisitIdRef.current = createdId;
    } else if (visit) {
      // 활성 행은 배드 상태 아이콘과 연동, 그 외 행은 로그 전용
      const skipSync = disableBedSync || rowStatus !== 'active';
      onUpdate(visit.id, { [key]: newVal }, skipSync);
    }
  };

  const menuTitle = disableBedSync || rowStatus !== 'active' ? "추가 사항 변경 (단순 기록)" : "추가 사항 변경 (배드 연동)";

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
    { key: 'is_injection', active: !!visit?.is_injection, label: '주사', bg: 'bg-red-500' },
    { key: 'is_fluid', active: !!visit?.is_fluid, label: '수액', bg: 'bg-cyan-500' },
    { key: 'is_manual', active: !!visit?.is_manual, label: '도수', bg: 'bg-violet-500' },
    { key: 'is_eswt', active: !!visit?.is_eswt, label: '충격파', bg: 'bg-blue-500' },
    { key: 'is_traction', active: !!visit?.is_traction, label: '견인', bg: 'bg-orange-500' },
    { key: 'is_ion', active: !!visit?.is_ion, label: '이온', bg: 'bg-emerald-500' },
    { key: 'is_exercise', active: !!visit?.is_exercise, label: '운동', bg: 'bg-lime-500' },
  ] as const satisfies ReadonlyArray<{ key: keyof PatientVisit; active: boolean; label: string; bg: string }>;

  const activeStatusPills = statusPills.filter((item) => item.active);

  useEffect(() => {
    if (!selectedStatusKey) return;
    const stillActive = activeStatusPills.some((item) => item.key === selectedStatusKey);
    if (!stillActive) {
      setSelectedStatusKey(null);
    }
  }, [selectedStatusKey, activeStatusPills]);

  // Helper for title (tooltip)
  const getTitle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return `더블탭하여 추가 사항 변경 (${disableBedSync || rowStatus !== 'active' ? '로그만 수정' : '배드 연동'})`;
    }
    return `더블클릭 또는 Enter로 추가 사항 변경 (${disableBedSync || rowStatus !== 'active' ? '로그만 수정' : '배드 연동'})`;
  };

  return (
    <>
      <div
        ref={cellRef}
        className="w-[calc(100%-4px)] h-[calc(100%-4px)] m-[2px] rounded-[1px] flex items-center justify-start cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:outline-offset-[-1px] focus:z-10"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          cellRef.current?.focus();
        }}
        onClick={() => cellRef.current?.focus()}
        onDoubleClick={executeInteraction}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        data-grid-id={gridId}
        title={getTitle()}
      >
        {hasActiveStatus ? (
          <div className="w-full min-h-0 px-1.5 py-0 flex items-center justify-start">
            <div className="flex flex-wrap items-center justify-start gap-1 max-w-full">
              {activeStatusPills.map((item) => (
                <span
                  key={item.label}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    cellRef.current?.focus();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStatusKey((prev) => prev === item.key ? null : item.key);
                  }}
                  className={`px-1.5 py-0.5 rounded-md text-[13px] font-black text-white ${item.bg} ${selectedStatusKey === item.key ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-slate-800' : ''}`}
                >
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
            targetVisitIdRef.current = visit?.id ?? null;
            setTimeout(() => cellRef.current?.focus(), 0);
          }}
          onToggle={toggleStatus}
          title={menuTitle}
        />
      )}
    </>
  );
});
