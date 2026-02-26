
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
      isInjectionCompleted: false,
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
  const { realtimeStatus, refresh, broadcastClearBed } = useBedRealtime(setBeds, setLocalBeds);

  const hasActiveBeds = beds.some(b => b.status === BedStatus.ACTIVE && !b.isPaused);
  useWakeLock(hasActiveBeds);
  useAudioWakeLock(hasActiveBeds, isBackgroundKeepAlive);

  // 3. Sync LocalStorage on Mount/Offline
  useEffect(() => {
    if (!isOnlineMode()) setBeds(localBeds);
  }, [localBeds]);

  // DB 쓰기 디바운스 (bed ID → timeout)
  const dbWriteTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const pendingUpdates = useRef<Map<number, Partial<BedState>>>(new Map());

  // 4. Core State Updater (DB Sync included)
  const updateBedState = useCallback(async (bedId: number, updates: Partial<BedState>) => {
    const timestamp = Date.now();
    const updateWithTimestamp = { ...updates, lastUpdateTimestamp: timestamp };

    // Optimistic Update (즉시 UI 반영)
    setBeds(prev => prev.map(b => b.id === bedId ? { ...b, ...updateWithTimestamp } : b));
    setLocalBeds(prev => prev.map(b => b.id === bedId ? { ...b, ...updateWithTimestamp } : b));

    // Database Update
    if (!isOnlineMode() || !supabase) return;

    // status 변경은 즉시 전송 (clearBed, 치료 시작 등)
    const isStatusChange = updates.status !== undefined;
    if (isStatusChange) {
      // 진행 중인 디바운스 취소 후 즉시 전송
      const existing = dbWriteTimers.current.get(bedId);
      if (existing) {
        clearTimeout(existing);
        dbWriteTimers.current.delete(bedId);
        pendingUpdates.current.delete(bedId);
      }
      const dbPayload = mapBedToDbPayload(updates);
      await supabase.from('beds').update(dbPayload).eq('id', bedId);
      return;
    }

    // 일반 업데이트는 300ms 디바운스
    const prev = pendingUpdates.current.get(bedId) || {};
    pendingUpdates.current.set(bedId, { ...prev, ...updates });

    const existingTimer = dbWriteTimers.current.get(bedId);
    if (existingTimer) clearTimeout(existingTimer);

    dbWriteTimers.current.set(bedId, setTimeout(async () => {
      dbWriteTimers.current.delete(bedId);
      const merged = pendingUpdates.current.get(bedId);
      pendingUpdates.current.delete(bedId);
      if (!merged) return;

      const dbPayload = mapBedToDbPayload(merged);
      const { error } = await supabase!.from('beds').update(dbPayload).eq('id', bedId);
      if (error) console.error(`[BedState] DB update failed (bed ${bedId}):`, error.message);
    }, 300));
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
    broadcastClearBed, // 침상 비우기 브로드캐스트
    realtimeStatus
  };
};
