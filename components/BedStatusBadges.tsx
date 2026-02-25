
import React, { memo } from 'react';
import { Syringe, Hand, Zap, ArrowUpFromLine, Droplet, Star, LucideIcon } from 'lucide-react';
import { BedState, BedStatus } from '../types';

interface BedStatusBadgesProps {
  bed: BedState;
}

interface BadgeConfig {
  key: keyof BedState | 'patientMemo';
  label: string;
  icon: LucideIcon;
  colorClass: string; // Text color
  renderText?: boolean;
}

const BADGES: BadgeConfig[] = [
  { key: 'isInjection', label: '주사', icon: Syringe, colorClass: 'text-red-500' },
  { key: 'isInjectionCompleted', label: '완료', icon: Syringe, colorClass: 'text-gray-500', renderText: true },
  { key: 'isFluid', label: '수액', icon: Droplet, colorClass: 'text-cyan-500' },
  { key: 'isManual', label: '도수', icon: Hand, colorClass: 'text-violet-500' },
  { key: 'isESWT', label: '충격파', icon: Zap, colorClass: 'text-blue-500' },
  { key: 'isTraction', label: '견인', icon: ArrowUpFromLine, colorClass: 'text-orange-500' },
  { key: 'patientMemo', label: '메모', icon: Star, colorClass: 'text-yellow-400' }
];

export const BedStatusBadges: React.FC<BedStatusBadgesProps> = memo(({ bed }) => {
  if (bed.status === BedStatus.IDLE) return null;
  const activeBadges = BADGES.filter(b => b.key === 'patientMemo' ? !!bed.patientMemo : !!bed[b.key as keyof BedState]);
  const count = activeBadges.length;

  if (count === 0) return null;

  // Layout Logic:
  // 3개 이상: Grid (2 columns)
  // 2개 이하: Flex (Single row)
  const layoutClass = count >= 3
    ? "grid grid-cols-2 gap-[1px] justify-items-center"
    : "flex items-center gap-[1px]";

  // Icon Size Logic (Mobile Portrait Only):
  // 기준: w-5 (20px)
  // 1개, 2개: 20% 축소 -> w-4 (16px)
  // 3개 이상: 30% 축소 -> w-3.5 (14px)
  // sm(태블릿/PC) 이상은 w-7 (28px) 고정
  let iconSizeClass = "";

  if (count >= 3) {
    iconSizeClass = "w-3.5 h-3.5"; // 30% smaller
  } else {
    iconSizeClass = "w-4 h-4";     // 20% smaller (for 1 or 2)
  }

  // Combine with desktop override
  iconSizeClass += " sm:w-[31px] sm:h-[31px] md:w-[34px] md:h-[34px]";

  return (
    <div className={layoutClass}>
      {activeBadges.map((badge) => (
        <div
          key={badge.label}
          className={`flex flex-col items-center justify-center p-0.5 sm:p-0 rounded ${badge.colorClass}`}
          title={badge.key === 'patientMemo' ? bed.patientMemo : badge.label}
        >
          <badge.icon className={iconSizeClass} strokeWidth={badge.key === 'patientMemo' ? 2 : 2.5} fill={badge.key === 'patientMemo' ? 'currentColor' : 'none'} />
          {badge.renderText && (
            <span className="text-[8px] sm:text-[10px] font-bold leading-none mt-0.5">{badge.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Ignore timer updates
  const pBed = prevProps.bed;
  const nBed = nextProps.bed;
  return (
    pBed.status === nBed.status &&
    pBed.isInjection === nBed.isInjection &&
    pBed.isInjectionCompleted === nBed.isInjectionCompleted &&
    pBed.patientMemo === nBed.patientMemo &&
    pBed.isFluid === nBed.isFluid &&
    pBed.isManual === nBed.isManual &&
    pBed.isESWT === nBed.isESWT &&
    pBed.isTraction === nBed.isTraction
  );
});
