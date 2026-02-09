
import React, { memo } from 'react';
import { Syringe, Hand, Zap, ArrowUpFromLine, Droplet, LucideIcon } from 'lucide-react';
import { BedState, BedStatus } from '../types';

interface BedStatusBadgesProps {
  bed: BedState;
}

interface BadgeConfig {
  key: keyof BedState;
  label: string;
  icon: LucideIcon;
  colorClass: string; // Text color
}

const BADGES: BadgeConfig[] = [
  { key: 'isInjection', label: '주사', icon: Syringe, colorClass: 'text-red-500' },
  { key: 'isFluid', label: '수액', icon: Droplet, colorClass: 'text-cyan-500' },
  { key: 'isManual', label: '도수', icon: Hand, colorClass: 'text-violet-500' },
  { key: 'isESWT', label: '충격파', icon: Zap, colorClass: 'text-blue-500' },
  { key: 'isTraction', label: '견인', icon: ArrowUpFromLine, colorClass: 'text-orange-500' }
];

export const BedStatusBadges: React.FC<BedStatusBadgesProps> = memo(({ bed }) => {
  if (bed.status === BedStatus.IDLE) return null;
  const activeBadges = BADGES.filter(b => bed[b.key]);
  const count = activeBadges.length;
  
  if (count === 0) return null;

  // Layout Logic:
  // 3개 이상: Grid (2 columns)
  // 2개 이하: Flex (Single row)
  const layoutClass = count >= 3 
    ? "grid grid-cols-2 gap-[1px] justify-items-center" 
    : "flex items-center gap-[1px]";

  // Icon Size Logic (Mobile Portrait Only):
  // 1개: w-5 (20px) - 기준
  // 2개: w-[18px] (10% 축소)
  // 3개 이상: w-4 (16px) (20% 축소)
  // sm(태블릿/PC) 이상은 w-6 (24px) 고정
  let iconSizeClass = "w-5 h-5"; 
  if (count === 2) {
    iconSizeClass = "w-[18px] h-[18px]";
  } else if (count >= 3) {
    iconSizeClass = "w-4 h-4";
  }
  
  // Combine with desktop override
  iconSizeClass += " sm:w-6 sm:h-6";

  return (
    <div className={layoutClass}>
      {activeBadges.map((badge) => (
        <div 
          key={badge.label} 
          className={`flex items-center justify-center p-0.5 rounded ${badge.colorClass}`}
          title={badge.label}
        >
          <badge.icon className={iconSizeClass} strokeWidth={2.5} />
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
    pBed.isFluid === nBed.isFluid &&
    pBed.isManual === nBed.isManual &&
    pBed.isESWT === nBed.isESWT &&
    pBed.isTraction === nBed.isTraction
  );
});
