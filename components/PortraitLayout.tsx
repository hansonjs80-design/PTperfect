
import React, { memo, useCallback, useMemo } from 'react';
import { BedLayoutProps, BedState } from '../types';
import { PORTRAIT_PAIRS_CONFIG, PORTRAIT_PAIRS_CONFIG_ALT } from '../constants/layout';
import { PortraitBedRow } from './PortraitBedRow';
import { useTreatmentContext } from '../contexts/TreatmentContext';

export const PortraitLayout: React.FC<BedLayoutProps> = memo(({ beds, presets }) => {
  const { layoutMode } = useTreatmentContext();
  
  const getBed = useCallback((id: number): BedState => {
    return beds.find(b => b.id === id) || beds[0];
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
    <div className="flex flex-col gap-4 pb-32 max-w-4xl mx-auto px-1 sm:px-1.5">
      {groupedPairs.map((group, groupIdx) => (
        <div key={`group-${groupIdx}`} className="flex flex-col gap-[1px]">
          {group.map((pair, idx) => {
            const leftBed = pair.left ? getBed(pair.left) : null;
            const rightBed = pair.right ? getBed(pair.right) : null;

            return (
              <PortraitBedRow 
                key={`${groupIdx}-${idx}`}
                leftBed={leftBed}
                rightBed={rightBed}
                presets={presets}
                beds={beds}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
});
