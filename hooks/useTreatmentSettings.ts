
import { useLocalStorage } from './useLocalStorage';

export const useTreatmentSettings = () => {
  const [isSoundEnabled, setIsSoundEnabled] = useLocalStorage<boolean>('physio-sound-enabled', false);
  const [isBackgroundKeepAlive, setIsBackgroundKeepAlive] = useLocalStorage<boolean>('physio-bg-keep-alive', true);
  const [layoutMode, setLayoutMode] = useLocalStorage<'default' | 'alt' | 'option3'>('physio-layout-mode', 'default');

  const toggleSound = () => setIsSoundEnabled(prev => !prev);
  const toggleBackgroundKeepAlive = () => setIsBackgroundKeepAlive(prev => !prev);
  
  // Cycle: Default -> Alt -> Option3 -> Default
  const toggleLayoutMode = () => setLayoutMode(prev => {
    if (prev === 'default') return 'alt';
    if (prev === 'alt') return 'option3';
    return 'default';
  });

  return {
    isSoundEnabled,
    toggleSound,
    isBackgroundKeepAlive,
    toggleBackgroundKeepAlive,
    layoutMode,
    toggleLayoutMode
  };
};
