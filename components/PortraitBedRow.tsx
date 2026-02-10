
import React, { memo } from 'react';
import { BedState, BedLayoutProps } from '../types';
import { BedBay } from './BedBay';
import { LandscapeEmptyCell } from './LandscapeCells';

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
      <div className="flex flex-col h-full">
        {leftBed ? (
          <BedBay 
            beds={[leftBed]}
            presets={presets}
            side="left"
          />
        ) : (
          <div className="h-full">
            <LandscapeEmptyCell />
          </div>
        )}
      </div>

      <div className="flex flex-col h-full">
        {rightBed ? (
          <BedBay 
            beds={[rightBed]}
            presets={presets}
            side="right"
          />
        ) : (
          <div className="h-full">
            <LandscapeEmptyCell />
          </div>
        )}
      </div>
    </div>
  );
});
