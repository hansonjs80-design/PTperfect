
import React, { useEffect, useRef } from 'react';
import { BedState, Preset, BedStatus } from '../types';
import { calculateRemainingTime } from '../utils/bedLogic';
import { playAlarmPattern } from '../utils/alarm';
import { getAbbreviation } from '../utils/bedUtils';

export const useBedTimer = (
  setBeds: React.Dispatch<React.SetStateAction<BedState[]>>,
  presets: Preset[],
  isSoundEnabled: boolean,
  beds: BedState[]
) => {
  // Refs to access latest state inside interval closure without re-creating the interval
  const bedsRef = useRef(beds);
  const presetsRef = useRef(presets);
  const isSoundEnabledRef = useRef(isSoundEnabled);
  const alertedBedsRef = useRef<Set<number>>(new Set());

  // Sync refs with latest props
  useEffect(() => {
    bedsRef.current = beds;
    presetsRef.current = presets;
    isSoundEnabledRef.current = isSoundEnabled;
  }, [beds, presets, isSoundEnabled]);

  useEffect(() => {
    const tick = () => {
      const currentPresets = presetsRef.current;
      const soundEnabled = isSoundEnabledRef.current;

      setBeds((currentBeds) => {
        let hasChanges = false;
        
        const newBeds = currentBeds.map((bed) => {
          // 1. Calculate Time using shared utility (Relies on Date.now() delta)
          const newRemaining = calculateRemainingTime(bed, currentPresets);
          
          // 2. Check Alarm Condition
          if (bed.status === BedStatus.ACTIVE && !bed.isPaused) {
             const preset = bed.customPreset || currentPresets.find(p => p.id === bed.currentPresetId);
             const step = preset?.steps[bed.currentStepIndex];
             
             if (step?.enableTimer) {
                 if (newRemaining <= 0) {
                     // Trigger alarm only once per expiration
                     if (!alertedBedsRef.current.has(bed.id)) {
                         const stepName = step ? getAbbreviation(step.name) : '';
                         playAlarmPattern(bed.id, stepName, !soundEnabled);
                         alertedBedsRef.current.add(bed.id);
                     }
                 } else {
                     // Reset alert tracker if time is added/reset (e.g. paused then resumed with more time)
                     alertedBedsRef.current.delete(bed.id);
                 }
             }
          } else {
             // Cleanup if bed becomes idle or paused
             alertedBedsRef.current.delete(bed.id);
          }

          // Only update state if the remaining time actually changed (prevents unnecessary re-renders)
          if (newRemaining !== bed.remainingTime) {
            hasChanges = true;
            return { ...bed, remainingTime: newRemaining };
          }
          return bed;
        });

        return hasChanges ? newBeds : currentBeds;
      });
    };

    // Run tick every second (1000ms)
    // Using setInterval on main thread avoids Worker bundling issues on Vercel
    const intervalId = setInterval(tick, 1000);

    return () => clearInterval(intervalId);
  }, [setBeds]);
};
