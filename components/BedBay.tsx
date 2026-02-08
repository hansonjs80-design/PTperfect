
import React, { memo } from 'react';
import { BedState, Preset } from '../types';
import { BedCard } from './BedCard';

interface BedBayProps {
  beds: BedState[]; 
  presets: Preset[]; 
  side: 'left' | 'right';
  isEmpty?: boolean;
}

export const BedBay: React.FC<BedBayProps> = memo(({ 
  beds, 
  presets, 
  isEmpty 
}) => {
  if (isEmpty) {
    return (
      <div className="h-full flex flex-col gap-2 p-1 rounded-xl border-2 border-dashed border-gray-400/30 dark:border-slate-800 bg-gray-100/30 dark:bg-slate-900/20 min-h-[120px]">
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col gap-1.5 sm:gap-3 p-0 sm:p-1 rounded-xl bg-transparent`}>
      {beds.map(bed => (
        <div key={bed.id} className="w-full h-auto sm:h-full">
          <BedCard 
            bed={bed}
            presets={presets}
            isCompact={true}
          />
        </div>
      ))}
    </div>
  );
});
