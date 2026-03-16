
import React, { memo, useCallback, useMemo } from 'react';
import { BedLayoutProps, BedState } from '../types';
import { PORTRAIT_PAIRS_CONFIG, PORTRAIT_PAIRS_CONFIG_ALT } from '../constants/layout';
import { PortraitBedRow } from './PortraitBedRow';
import { useTreatmentContext } from '../contexts/TreatmentContext';

export const PortraitLayout: React.FC<BedLayoutProps> = memo(({ beds, presets }) => {
  const { layoutMode } = useTreatmentContext();
  
  const getBed = useCallback((id: number): BedState | null => {
    return beds.find(b => b.id === id) || null;
  }, [beds]);

  const config = layoutMode === 'default' ? PORTRAIT_PAIRS_CONFIG : PORTRAIT_PAIRS_CONFIG_ALT;

  const groupedPairs = useMemo(() => {
    const groups = [];
    for (let i = 0; i < config.length; i += 2) {
      groups.push(config.slice(i, i + 2));
    }
    return groups;
  }, [config]);

  return (
    <div className="flex flex-col gap-4 pb-4 max-w-4xl mx-auto px-1 sm:px-1.5 md:flex-1 md:pb-0 md:gap-2 md:max-w-none md:w-full">
      {groupedPairs.map((group, groupIdx) => (
        <div key={`group-${groupIdx}`} className="flex flex-col gap-[4px] md:flex-1">
          {group.map((pair, idx) => {
            const leftBed = pair.left ? getBed(pair.left) : null;
            const rightBed = pair.right ? getBed(pair.right) : null;

            // Apply specific spacing for Tablet Portrait (md breakpoint)
            // Identify pairs by checking if they contain the specific bed IDs
            const hasBed3 = pair.left === 3 || pair.right === 3;
            const hasBed10 = pair.left === 10 || pair.right === 10;
            const isRow3_10 = hasBed3 && hasBed10;

            const hasBed4 = pair.left === 4 || pair.right === 4;
            const hasBed9 = pair.left === 9 || pair.right === 9;
            const isRow4_9 = hasBed4 && hasBed9;

            const spacingClass = `
              ${isRow3_10 ? 'md:mt-[4px]' : ''}
              ${isRow4_9 ? 'md:mb-[4px]' : ''}
            `;

            return (
              <div key={`${groupIdx}-${idx}`} className={`md:flex-1 ${spacingClass}`}>
                <PortraitBedRow 
                  leftBed={leftBed}
                  rightBed={rightBed}
                  presets={presets}
                  beds={beds}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});
