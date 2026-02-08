
import React, { memo } from 'react';
import { BedState, BedLayoutProps } from '../types';
import { BedBay } from './BedBay';

interface PortraitBedRowProps extends Omit<BedLayoutProps, 'beds'> {
  leftBed: BedState | null; // Allow null for empty left slot
  rightBed: BedState | null;
  beds: BedState[]; 
}

export const PortraitBedRow: React.FC<PortraitBedRowProps> = memo(({ 
  leftBed, 
  rightBed, 
  presets
}) => {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-5 md:gap-6">
      <div className="flex flex-col">
        {leftBed ? (
          <BedBay 
            beds={[leftBed]}
            presets={presets}
            side="left"
          />
        ) : (
          <div className="h-full flex flex-col gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200/50 dark:border-slate-800/50 bg-transparent opacity-20 select-none items-center justify-center">
            <span className="text-gray-400 dark:text-slate-700 text-[10px] font-black uppercase tracking-widest">
              EMPTY
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col">
        {rightBed ? (
          <BedBay 
            beds={[rightBed]}
            presets={presets}
            side="right"
          />
        ) : (
          <div className="h-full flex flex-col gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200/50 dark:border-slate-800/50 bg-transparent opacity-20 select-none items-center justify-center">
            <span className="text-gray-400 dark:text-slate-700 text-[10px] font-black uppercase tracking-widest">
              EMPTY
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
