import React, { memo } from 'react';
import { BedState, Preset } from '../types';
import { BedCard } from './BedCard';

interface LandscapeBedCellProps {
  bed: BedState;
  presets: Preset[];
}

export const LandscapeBedCell: React.FC<LandscapeBedCellProps> = memo(({ bed, presets }) => {
  return (
    <div className="w-full h-full min-h-0">
      <BedCard 
        bed={bed}
        presets={presets}
        isCompact={true}
      />
    </div>
  );
});

export const LandscapeEmptyCell: React.FC = memo(() => {
  return (
    <div 
      className="
        w-full h-full
        rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-800 bg-gray-100/30 dark:bg-slate-900/30 
        min-h-[110px] lg:min-h-[216px]
        flex items-center justify-center
        invisible md:visible
      "
    >
       <span className="text-gray-300 dark:text-slate-700 font-black text-sm opacity-50 uppercase tracking-widest">Empty</span>
    </div>
  );
});