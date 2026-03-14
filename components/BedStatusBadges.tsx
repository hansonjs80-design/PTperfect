
import React, { memo } from 'react';
import { Syringe, Hand, Zap, ArrowUpFromLine, Droplet, Star, Atom, Dumbbell, LucideIcon } from 'lucide-react';
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

  { key: 'isFluid', label: '수액', icon: Droplet, colorClass: 'text-cyan-500' },
  { key: 'isManual', label: '도수', icon: Hand, colorClass: 'text-violet-500' },
  { key: 'isESWT', label: '충격파', icon: Zap, colorClass: 'text-blue-500' },
  { key: 'isTraction', label: '견인', icon: ArrowUpFromLine, colorClass: 'text-orange-500' },
  { key: 'isIon', label: '이온', icon: Atom, colorClass: 'text-emerald-500' },
  { key: 'isExercise', label: '운동', icon: Dumbbell, colorClass: 'text-lime-500' },
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

  // Icon Size Logic:
  // 현재 기준에서 약 10% 축소
  let iconSizeClass = "";

  if (count >= 3) {
    iconSizeClass = "w-[9px] h-[9px]";
  } else {
    iconSizeClass = "w-[10.8px] h-[10.8px]";
  }

  // 모바일/태블릿은 기존 유지, 데스크톱(lg+)만 약 10% 축소
  iconSizeClass += " sm:w-[20px] sm:h-[20px] md:w-[23px] md:h-[23px] lg:w-[20.7px] lg:h-[20.7px]";

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
    pBed.patientMemo === nBed.patientMemo &&
    pBed.isFluid === nBed.isFluid &&
    pBed.isManual === nBed.isManual &&
    pBed.isESWT === nBed.isESWT &&
    pBed.isTraction === nBed.isTraction &&
    pBed.isIon === nBed.isIon &&
    pBed.isExercise === nBed.isExercise
  );
});
