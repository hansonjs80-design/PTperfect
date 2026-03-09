
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
    // 하단 카드 잘림 방지: 내부 그리드가 고정 높이에 맞춰 찌그러지지 않도록 세로는 자연 높이로 두고,
    // 부모(main) 스크롤에서 끝까지 내려 볼 수 있게 한다.
    <div className="block w-full h-auto overflow-x-auto overflow-y-visible custom-scrollbar pb-[env(safe-area-inset-bottom)] px-0 lg:flex lg:items-start lg:min-h-full lg:pt-1">
      <div className="
        grid h-auto content-start
        auto-rows-max
        gap-y-[5px] gap-x-[5px] sm:gap-y-[5px] sm:gap-x-[5px] md:gap-y-[12px]
        lg:gap-y-[11px] lg:gap-x-[7px]
        grid-cols-4 lg:grid-cols-[1fr_1fr_0px_1fr_1fr]
        min-w-[170vw] px-2 pl-[18px] pt-[4px]
        sm:min-w-[120vw] sm:px-0
        md:min-w-0 md:w-full md:px-1
        lg:min-w-0 lg:w-full lg:px-1 lg:pt-1
      ">
        {gridItems}
      </div>
    </div>
  );
});
