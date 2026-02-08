
import React, { Suspense } from 'react';
import { BedLayoutProps } from '../types';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Loader2 } from 'lucide-react';

// Code Splitting: Lazy load layouts to improve initial load time and responsiveness
const PortraitLayout = React.lazy(() => import('./PortraitLayout').then(m => ({ default: m.PortraitLayout })));
const LandscapeLayout = React.lazy(() => import('./LandscapeLayout').then(m => ({ default: m.LandscapeLayout })));

export const BedLayoutContainer: React.FC<BedLayoutProps> = (props) => {
  const isLandscape = useMediaQuery('(orientation: landscape)');

  return (
    <div className="w-full max-w-[1600px] mx-auto h-full px-0 sm:px-4">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-10 h-10 text-brand-500/50 animate-spin" />
        </div>
      }>
        {isLandscape ? (
          <LandscapeLayout {...props} />
        ) : (
          <PortraitLayout {...props} />
        )}
      </Suspense>
    </div>
  );
};
