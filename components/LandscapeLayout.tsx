
import React, { memo, useMemo } from 'react';
import { BedLayoutProps } from '../types';
import { LANDSCAPE_GRID_IDS, LANDSCAPE_GRID_IDS_ALT, LANDSCAPE_GRID_IDS_OPTION3 } from '../constants/layout';
import { LandscapeBedCell, LandscapeEmptyCell } from './LandscapeCells';
import { useTreatmentContext } from '../contexts/TreatmentContext';

export const LandscapeLayout: React.FC<BedLayoutProps> = memo(({ beds, presets }) => {
  const { layoutMode } = useTreatmentContext();
  const getBed = (id: number) => beds.find(b => b.id === id);

  const gridIds = useMemo(() => {
    if (layoutMode === 'alt') return LANDSCAPE_GRID_IDS_ALT;
    if (layoutMode === 'option3') return LANDSCAPE_GRID_IDS_OPTION3;
    return LANDSCAPE_GRID_IDS;
  }, [layoutMode]);

  const gridItems = useMemo(() => {
    const items = [];
    for (let i = 0; i < gridIds.length; i += 4) {
      // Helper to render a cell or empty slot
      const addCell = (id: number | null, keyPrefix: string) => {
        if (id === null) {
          items.push(<LandscapeEmptyCell key={`${keyPrefix}-empty`} />);
        } else {
          const bed = getBed(id);
          if (!bed) {
            items.push(<LandscapeEmptyCell key={`${keyPrefix}-missing`} />);
            return;
          }
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
    // Changed: Removed overflow-y-auto to prevent double scrollbars with MainLayout.
    // Kept overflow-x-auto for horizontal scrolling if needed.
    // Added pb-[120px] to ensure bottom content isn't hidden.
    <div className="block w-full h-full overflow-x-auto overflow-y-hidden custom-scrollbar pb-0 px-0 lg:flex lg:items-start lg:min-h-full lg:pt-1">
      <div className="
        grid h-full content-start lg:content-stretch
        auto-rows-fr
        gap-y-[5px] gap-x-[5px] sm:gap-y-[5px] sm:gap-x-[5px] md:gap-y-[12px]
        lg:gap-y-[14px] lg:gap-x-[7px]
        grid-cols-4 lg:grid-cols-[1fr_1fr_0px_1fr_1fr]
        min-w-[170vw] px-2 pl-[18px] pt-[4px]
        sm:min-w-[120vw] sm:px-0
        lg:min-w-0 lg:w-full lg:px-1 lg:pt-1
      ">
        {gridItems}
      </div>
    </div>
  );
});
