
import { useMemo } from 'react';

export const useLayoutStyles = (isFullScreen: boolean) => {
  const styles = useMemo(() => {
    // 1. Header Height Logic
    const headerHeightClass = `
      w-full z-40 will-change-transform
      /* Mobile Portrait: 62px */
      h-[calc(62px+env(safe-area-inset-top))]
      
      /* Tablet Portrait (md): 52px */
      md:h-[calc(52px+env(safe-area-inset-top))]
      
      /* Landscape Defaults (Mobile/Tablet): 48px (3rem) */
      landscape:h-[calc(3rem+env(safe-area-inset-top))]
      
      /* Desktop Sizes (xl): 60px */
      xl:h-[calc(60px+env(safe-area-inset-top))]
      /* Large Landscape (lg:landscape): 60px */
      lg:landscape:h-[calc(60px+env(safe-area-inset-top))]
      
      /* Positioning */
      absolute top-0 left-0 right-0
    `;

    // 2. Main Content Top Padding Logic
    const mainContentPaddingTop = isFullScreen 
      ? `
        /* Mobile Default: Keep existing spacing (10px gap) */
        pt-[calc(env(safe-area-inset-top)+10px)]
        
        /* Tablet & Desktop (md+): Add extra 20px as requested (Total 30px gap) */
        md:pt-[calc(env(safe-area-inset-top)+30px)]
      `
      : `
        /* Mobile Portrait Base: Header(62) + 20 */
        pt-[calc(62px+env(safe-area-inset-top)+20px)]
        
        /* Tablet Portrait: Header(52) + 20 */
        md:pt-[calc(52px+env(safe-area-inset-top)+20px)]

        /* Tablet/Mobile Landscape: Header(48) + 20 */
        landscape:pt-[calc(3rem+env(safe-area-inset-top)+20px)]

        /* Desktop / Large Landscape: Header(60) + 20 */
        lg:landscape:pt-[calc(60px+env(safe-area-inset-top)+20px)]
        xl:pt-[calc(60px+env(safe-area-inset-top)+20px)]
      `;

    // 3. Main Content Bottom Padding Logic
    const mainContentPaddingBottom = isFullScreen
      ? 'pb-[env(safe-area-inset-bottom)]'
      : 'pb-[calc(env(safe-area-inset-bottom)+120px)]';

    // 4. Close Button Position Logic (Full Screen)
    const closeButtonClass = `
      fixed z-[60] p-1.5 rounded-full backdrop-blur-md shadow-lg transition-all active:scale-95
      bg-black/30 dark:bg-white/10 text-gray-500 dark:text-gray-300 hover:text-white hover:bg-black/50 dark:hover:bg-white/20
      right-4
      
      /* Mobile: +10px */
      top-[calc(env(safe-area-inset-top)+10px)]
      
      /* Tablet/Desktop: +20px (Slightly lower to match increased content padding) */
      md:top-[calc(env(safe-area-inset-top)+20px)]
    `;

    return {
      headerHeightClass,
      mainContentPaddingTop,
      mainContentPaddingBottom,
      closeButtonClass
    };
  }, [isFullScreen]);

  return styles;
};
