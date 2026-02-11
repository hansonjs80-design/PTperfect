
import { useEffect, useRef, RefObject } from 'react';

// Define the breakpoint for switching between mobile (absolute/scroll-away) and desktop (relative/fixed)
// 768 (md) includes Tablet Portrait in the "Desktop" behavior
const DESKTOP_BREAKPOINT = 768; 

export const useHeaderScroll = (
  scrollContainerRef: RefObject<HTMLElement | null>,
  headerRef: RefObject<HTMLElement | null>
) => {
  // Store values in refs to avoid re-renders during scroll (Performance critical)
  const lastScrollY = useRef(0);
  const currentTranslateY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = scrollContainerRef.current;
      const header = headerRef.current;
      
      if (!scrollContainer || !header) return;

      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = scrollContainer.scrollTop;
          
          // Determine if we should apply mobile scroll behavior
          // 1. Width < 768px (Standard Mobile)
          // 2. Landscape Orientation on Mobile (Width might be > 768, but Height is small, e.g. < 600px)
          const isMobileWidth = window.innerWidth < DESKTOP_BREAKPOINT;
          const isMobileLandscape = window.matchMedia('(orientation: landscape)').matches && window.innerHeight < 600;
          const isMobileBehavior = isMobileWidth || isMobileLandscape;

          // On Desktop/Tablet (Portrait & Large Landscape), always reset to visible
          if (!isMobileBehavior) {
            header.style.transform = 'translate3d(0, 0, 0)';
            currentTranslateY.current = 0;
            lastScrollY.current = currentScrollY;
            ticking.current = false;
            return;
          }

          // Calculate how much we scrolled since last frame
          const delta = currentScrollY - lastScrollY.current;
          const headerHeight = header.offsetHeight;

          // iOS Bounce/Rubber-banding fix:
          // If at the very top, force visible
          if (currentScrollY <= 0) {
            currentTranslateY.current = 0;
            header.style.transform = 'translate3d(0, 0, 0)';
            lastScrollY.current = currentScrollY;
            ticking.current = false;
            return;
          }

          // Update translation based on delta
          // Scrolling Down (delta > 0) -> Subtract from translateY (move up)
          // Scrolling Up (delta < 0) -> Add to translateY (move down)
          currentTranslateY.current -= delta;

          // Clamp values:
          // 1. Cannot move further down than 0 (fully visible)
          if (currentTranslateY.current > 0) {
            currentTranslateY.current = 0;
          }
          // 2. Cannot move further up than -headerHeight (fully hidden)
          if (currentTranslateY.current < -headerHeight) {
            currentTranslateY.current = -headerHeight;
          }

          // Apply transform directly to DOM for 60fps performance
          header.style.transform = `translate3d(0, ${currentTranslateY.current}px, 0)`;

          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });

        ticking.current = true;
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Handle Resize to reset transform when switching modes
    const handleResize = () => {
       const isMobileWidth = window.innerWidth < DESKTOP_BREAKPOINT;
       const isMobileLandscape = window.matchMedia('(orientation: landscape)').matches && window.innerHeight < 600;
       
       if (!isMobileWidth && !isMobileLandscape && headerRef.current) {
         headerRef.current.style.transform = 'translate3d(0, 0, 0)';
       }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      scrollContainer?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [scrollContainerRef, headerRef]);
};
