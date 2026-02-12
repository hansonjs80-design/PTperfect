
import { useState, useEffect, useRef, useCallback } from 'react';
import { BedState, BedStatus, Preset } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { TOTAL_BEDS } from '../constants';
import { supabase, isOnlineMode } from '../lib/supabase';
import { mapBedToDbPayload } from '../utils/bedLogic';
import { useBedTimer } from './useBedTimer';
import { useBedRealtime } from './useBedRealtime';
import { useWakeLock } from './useWakeLock';
import { useAudioWakeLock } from './useAudioWakeLock';

export const useBedState = (
  presets: Preset[],
  isSoundEnabled: boolean,
  isBackgroundKeepAlive: boolean
) => {
  // 1. Local Storage & State Initialization
  const [localBeds, setLocalBeds] = useLocalStorage<BedState[]>('physio-beds-v8', 
    Array.from({ length: TOTAL_BEDS }, (_, i) => ({
      id: i + 1,
      status: BedStatus.IDLE,
      currentPresetId: null,
      currentStepIndex: 0,
      queue: [],
      remainingTime: 0,
      startTime: null,
      isPaused: false,
      isInjection: false,
      isFluid: false,
      isTraction: false,
      isESWT: false,
      isManual: false,
      memos: {}
    }))
  );

  const [beds, setBeds] = useState<BedState[]>(localBeds);
  const bedsRef = useRef(beds);
  
  // Sync Ref
  useEffect(() => {
    bedsRef.current = beds;
  }, [beds]);

  // 2. Sub-hooks (Infrastructure)
  useBedTimer(setBeds, presets, isSoundEnabled, beds);
  const { realtimeStatus, refresh } = useBedRealtime(setBeds, setLocalBeds);

  const hasActiveBeds = beds.some(b => b.status === BedStatus.ACTIVE && !b.isPaused);
  useWakeLock(hasActiveBeds);
  useAudioWakeLock(hasActiveBeds, isBackgroundKeepAlive);

  // 3. Sync LocalStorage on Mount/Offline
  useEffect(() => {
    if (!isOnlineMode()) setBeds(localBeds);
  }, [localBeds]);

  // 4. Core State Updater (DB Sync included)
  const updateBedState = useCallback(async (bedId: number, updates: Partial<BedState>) => {
    const timestamp = Date.now();
    const updateWithTimestamp = { ...updates, lastUpdateTimestamp: timestamp };
    
    // Optimistic Update
    setBeds(prev => prev.map(b => b.id === bedId ? { ...b, ...updateWithTimestamp } : b));
    setLocalBeds(prev => prev.map(b => b.id === bedId ? { ...b, ...updateWithTimestamp } : b));

    // Database Update
    if (isOnlineMode() && supabase) {
      const dbPayload = mapBedToDbPayload(updates);
      const { error } = await supabase.from('beds').update(dbPayload).eq('id', bedId);
      if (error) console.error(`[BedState] DB Update Failed:`, error.message);
    }
  }, [setLocalBeds]);

  // 5. Restore Full State (For Undo functionality)
  const restoreBeds = useCallback(async (restoredBeds: BedState[]) => {
    // Immediate Local Update (Replace entire array)
    setBeds(restoredBeds);
    setLocalBeds(restoredBeds);

    // Database Update (Bulk Upsert)
    if (isOnlineMode() && supabase) {
      const updates = restoredBeds.map(bed => {
        const payload = mapBedToDbPayload(bed);
        payload.id = bed.id;
        
        // Critical for Undo: Explicitly nullify fields that are undefined in the snapshot
        // (because mapBedToDbPayload skips undefined fields, but we need to clear them in DB if reverting to IDLE)
        if (!bed.customPreset) payload.custom_preset_json = null;
        if (!bed.currentPresetId) payload.current_preset_id = null;
        if (!bed.queue) payload.queue = [];
        
        return payload;
      });

      const { error } = await supabase.from('beds').upsert(updates);
      if (error) console.error("[BedState] Restore DB Failed:", error.message);
    }
  }, [setLocalBeds]);

  return { 
    beds, 
    bedsRef, 
    updateBedState,
    restoreBeds, // Exported for Undo logic
    refreshBeds: refresh, // Exported for Manual Refresh
    realtimeStatus 
  };
};
