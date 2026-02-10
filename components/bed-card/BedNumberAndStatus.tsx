
import React, { memo, useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { BedState, BedStatus } from '../../types';
import { getBedNumberColor } from '../../utils/styleUtils';
import { BedStatusBadges } from '../BedStatusBadges';

interface BedNumberAndStatusProps {
  bed: BedState;
  onMovePatient: (e: React.MouseEvent) => void;
  onMovePatientClick?: (e: React.MouseEvent) => void;
  onEditStatus: (e: React.MouseEvent) => void;
}

export const BedNumberAndStatus: React.FC<BedNumberAndStatusProps> = memo(({ 
  bed, 
  onMovePatient, 
  onMovePatientClick,
  onEditStatus 
}) => {
  const isBedT = bed.id === 11;
  const isIdle = bed.status === BedStatus.IDLE;
  
  const hasActiveBadges = bed.isInjection || bed.isFluid || bed.isManual || bed.isESWT || bed.isTraction;
  const showPlaceholder = !hasActiveBadges && bed.status === BedStatus.ACTIVE;

  // Ref for manual double-tap detection on status area
  const lastStatusClickRef = useRef<number>(0);

  const handleBedNumberClick = (e: React.MouseEvent) => {
    // If props provide a click handler (which likely contains double-tap logic from parent), use it.
    if (onMovePatientClick) {
        onMovePatientClick(e);
    }
    
    // Fallback/Desktop check
    if (window.matchMedia('(pointer: fine)').matches) {
        onMovePatient(e);
    }
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    // Prevent BedHeader from receiving this click
    e.preventDefault();
    e.stopPropagation();

    // Check for touch device
    const isTouch = window.matchMedia('(pointer: coarse)').matches;

    if (!isTouch) {
        // Desktop: Single click triggers action
        onEditStatus(e);
    } else {
        // Mobile: Manual Double Tap Detection
        const now = Date.now();
        if (now - lastStatusClickRef.current < 350) {
            onEditStatus(e);
            lastStatusClickRef.current = 0;
        } else {
            lastStatusClickRef.current = now;
        }
    }
  };

  const getTooltip = (baseText: string) => {
    if (typeof window !== 'undefined') {
        // Simple heuristic for tooltip text
        return window.matchMedia('(pointer: coarse)').matches ? `더블탭하여 ${baseText}` : `클릭하여 ${baseText}`;
    }
    return `클릭/더블클릭하여 ${baseText}`;
  };

  return (
    <div className="flex items-center gap-[5px]">
      {/* Bed Number */}
      <div 
        className={`flex items-center justify-center transition-transform select-none ${isIdle ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
        onClick={isIdle ? undefined : handleBedNumberClick}
        onDoubleClick={isIdle ? undefined : (e) => {
             e.stopPropagation();
             onMovePatient(e);
        }}
        title={isIdle ? undefined : getTooltip("환자 이동")}
      >
        <span className={`font-black tracking-tighter leading-none text-3xl lg:text-5xl ${getBedNumberColor(bed)}`}>
          {isBedT ? 'T' : bed.id}
        </span>
      </div>

      {/* Status Icons Area */}
      <div 
        className={`flex items-center justify-center cursor-pointer rounded-xl transition-all duration-200 min-w-[26px] sm:min-w-[37px] min-h-[33px] sm:min-h-[37px] hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20`}
        onClick={handleStatusClick}
        title={getTooltip("상태 아이콘 설정")}
      >
        <BedStatusBadges bed={bed} />
        
        {showPlaceholder && (
           <MoreHorizontal 
             className="w-6 h-6 text-slate-900/10 dark:text-white/10" 
             strokeWidth={3}
           />
        )}
      </div>
    </div>
  );
});
