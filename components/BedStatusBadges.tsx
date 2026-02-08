
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
  if (activeBadges.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {activeBadges.map((badge) => (
        <div 
          key={badge.label} 
          className={`flex items-center justify-center p-0.5 rounded-full bg-white/50 dark:bg-slate-700/50 shadow-sm ${badge.colorClass}`}
          title={badge.label}
        >
          <badge.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
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
