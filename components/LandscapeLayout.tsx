
import React, { memo, useMemo } from 'react';
import { BedLayoutProps } from '../types';
import { LANDSCAPE_GRID_IDS, LANDSCAPE_GRID_IDS_ALT } from '../constants/layout';
import { LandscapeBedCell, LandscapeEmptyCell } from './LandscapeCells';
import { useTreatmentContext } from '../contexts/TreatmentContext';

export const LandscapeLayout: React.FC<BedLayoutProps> = memo(({ beds, presets }) => {
  const { layoutMode } = useTreatmentContext();
  const getBed = (id: number) => beds.find(b => b.id === id) || beds[0];

  const gridIds = layoutMode === 'default' ? LANDSCAPE_GRID_IDS : LANDSCAPE_GRID_IDS_ALT;

  const gridItems = useMemo(() => {
    const items = [];
    for (let i = 0; i < gridIds.length; i += 4) {
      // Helper to render a cell or empty slot
      const addCell = (id: number | null, keyPrefix: string) => {
        if (id === null) {
          items.push(<LandscapeEmptyCell key={`${keyPrefix}-empty`} />);
        } else {
          const bed = getBed(id);
          items.push(<LandscapeBedCell key={id} bed={bed} presets={presets} />);
        }
      };

      // Left Pair
      addCell(gridIds[i], `row-${i}-col-1`);
      addCell(gridIds[i+1], `row-${i}-col-2`);
      
      // Desktop Spacer (Aisle)
      items.push(<div key={`spacer-${i}`} className="hidden lg:block w-full" />);
      
      // Right Pair
      addCell(gridIds[i+2], `row-${i}-col-3`);
      addCell(gridIds[i+3], `row-${i}-col-4`);
    }
    return items;
  }, [beds, presets, gridIds]);

  return (
    <div className="block w-full h-full overflow-x-auto overflow-y-auto custom-scrollbar pb-0 px-0">
      <div className="
        grid content-start
        gap-y-[5px] gap-x-[5px] sm:gap-y-[5px] sm:gap-x-[5px]
        lg:gap-y-6 lg:gap-x-1.5 
        grid-cols-4 lg:grid-cols-[1fr_1fr_0px_1fr_1fr]
        min-w-[170vw] px-2 pl-[28px] pt-0
        sm:min-w-[120vw] sm:px-0
        lg:min-w-0 lg:w-full
        translate-x-[10px] translate-y-[10px]
      ">
        {gridItems}
      </div>
    </div>
  );
});
