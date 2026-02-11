
import React, { memo, useMemo } from 'react';
import { BedLayoutProps } from '../types';
import { LANDSCAPE_GRID_IDS, LANDSCAPE_GRID_IDS_ALT, LANDSCAPE_GRID_IDS_OPTION3 } from '../constants/layout';
import { LandscapeBedCell, LandscapeEmptyCell } from './LandscapeCells';
import { useTreatmentContext } from '../contexts/TreatmentContext';

export const LandscapeLayout: React.FC<BedLayoutProps> = memo(({ beds, presets }) => {
  const { layoutMode } = useTreatmentContext();
  const getBed = (id: number) => beds.find(b => b.id === id) || beds[0];

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
    <div className="block w-full h-full overflow-x-auto custom-scrollbar pb-[120px] px-0">
      <div className="
        grid content-start
        gap-y-[5px] gap-x-[5px] sm:gap-y-[5px] sm:gap-x-[5px] md:gap-y-[20px]
        lg:gap-y-6 lg:gap-x-1.5 
        grid-cols-4 lg:grid-cols-[1fr_1fr_0px_1fr_1fr]
        min-w-[170vw] px-2 pl-[28px] pt-[4px]
        sm:min-w-[120vw] sm:px-0
        lg:min-w-0 lg:w-full lg:px-1
        
        /* Reset translations for landscape to avoid shifting */
        translate-x-[25px] translate-y-[10px] md:landscape:translate-y-0 lg:translate-x-0 lg:translate-y-0
        
        /* Reset margins. Use pt-2 instead of pt-0 to prevent clipping of top shadows/borders */
        md:-mt-[15px] md:landscape:mt-0 md:landscape:pt-2 lg:mt-0 lg:pt-2
      ">
        {gridItems}
      </div>
    </div>
  );
});
