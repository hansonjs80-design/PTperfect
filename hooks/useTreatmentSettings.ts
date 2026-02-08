
import { useLocalStorage } from './useLocalStorage';

export const useTreatmentSettings = () => {
  const [isSoundEnabled, setIsSoundEnabled] = useLocalStorage<boolean>('physio-sound-enabled', false);
  const [isBackgroundKeepAlive, setIsBackgroundKeepAlive] = useLocalStorage<boolean>('physio-bg-keep-alive', true);
  const [layoutMode, setLayoutMode] = useLocalStorage<'default' | 'alt'>('physio-layout-mode', 'default');

  const toggleSound = () => setIsSoundEnabled(prev => !prev);
  const toggleBackgroundKeepAlive = () => setIsBackgroundKeepAlive(prev => !prev);
  const toggleLayoutMode = () => setLayoutMode(prev => prev === 'default' ? 'alt' : 'default');

  return {
    isSoundEnabled,
    toggleSound,
    isBackgroundKeepAlive,
    toggleBackgroundKeepAlive,
    layoutMode,
    toggleLayoutMode
  };
};
