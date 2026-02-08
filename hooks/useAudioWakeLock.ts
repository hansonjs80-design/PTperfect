
import { useEffect, useRef } from 'react';

// A tiny silent WAV file (base64 encoded) to keep the audio session active.
// This tricks the browser/OS into thinking the user is listening to music, 
// preventing the CPU from sleeping and allowing timers/sounds to trigger in the background.
const SILENT_AUDIO_URL = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export const useAudioWakeLock = (isActive: boolean, isEnabled: boolean) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio element only once
    if (!audioRef.current) {
      audioRef.current = new Audio(SILENT_AUDIO_URL);
      audioRef.current.loop = true;
      audioRef.current.preload = 'auto';
      // Volume must be non-zero for iOS to respect it as active media, 
      // but low enough to be inaudible.
      audioRef.current.volume = 0.01; 
    }

    const manageAudio = async () => {
      try {
        if (isActive && isEnabled) {
          // User interaction is required to start audio context.
          // Since the user clicks "Start Treatment", this block usually succeeds.
          if (audioRef.current?.paused) {
            await audioRef.current.play();
            // console.log('[WakeLock] Background audio active');
          }
        } else {
          // If not active OR feature is disabled, pause audio
          if (!audioRef.current?.paused) {
            audioRef.current?.pause();
            // console.log('[WakeLock] Background audio paused');
          }
        }
      } catch (e) {
        // This usually happens if the user hasn't interacted with the page yet.
        // It will retry on the next render or user interaction.
        console.warn('[WakeLock] Audio playback failed (Interaction needed):', e);
      }
    };

    manageAudio();

    return () => {
      // Cleanup on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isActive, isEnabled]);
};
