import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    // Modern browsers support addEventListener on MediaQueryList
    media.addEventListener('change', listener);
    
    // Double check in case it changed between init and effect
    if (media.matches !== matches) {
        setMatches(media.matches);
    }

    return () => media.removeEventListener('change', listener);
  }, [query, matches]);

  return matches;
}