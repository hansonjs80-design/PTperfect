
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
      isIon: false,
      isExercise: false,
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
  // skipDbWrite: clearBed 시 updateBedState는 로컬만 업데이트하고, DB는 clearBedInDb가 담당
  const updateBedState = useCallback(async (bedId: number, updates: Partial<BedState>, skipDbWrite: boolean = false) => {
    const timestamp = Date.now();
    const localUpdatedAt = new Date(timestamp).toISOString();
    const updateWithTimestamp = { ...updates, lastUpdateTimestamp: timestamp, updatedAt: localUpdatedAt };

    // Optimistic Update (즉시 UI 반영)
    setBeds(prev => prev.map(b => b.id === bedId ? { ...b, ...updateWithTimestamp } : b));
    setLocalBeds(prev => prev.map(b => b.id === bedId ? { ...b, ...updateWithTimestamp } : b));

    // skipDbWrite=true이면 DB 쓰기 건너뜀 (clearBed 전용 — clearBedInDb가 전체 필드를 직접 upsert)
    if (skipDbWrite) {
      // 진행 중인 디바운스도 취소 (stale 데이터 전송 방지)
      const existing = dbWriteTimers.current.get(bedId);
      if (existing) {
        clearTimeout(existing);
        dbWriteTimers.current.delete(bedId);
        pendingUpdates.current.delete(bedId);
      }
      return;
    }

    // Database Update
    if (!isOnlineMode() || !supabase) return;

    // status 변경은 즉시 전송 (치료 시작 등)
    const isStatusChange = updates.status !== undefined;
    if (isStatusChange) {
      // 진행 중인 디바운스 취소
      const existing = dbWriteTimers.current.get(bedId);
      if (existing) {
        clearTimeout(existing);
        dbWriteTimers.current.delete(bedId);
        pendingUpdates.current.delete(bedId);
      }
      const dbPayload = mapBedToDbPayload(updates);
      const { error } = await supabase.from('beds').update(dbPayload).eq('id', bedId);
      if (error) {
        console.error(`[BedState] DB status update failed (bed ${bedId}):`, error.message);
        await supabase.from('beds').update(dbPayload).eq('id', bedId);
      }
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

  // 4-B. clearBed 전용 DB 업데이트 (모든 필드 명시적 초기화 + 3회 재시도)
  const clearBedInDb = useCallback(async (bedId: number) => {
    if (!isOnlineMode() || !supabase) return;

    // 이 clear 요청 시점 이후에 같은 bed가 다시 활성화되면 stale clear write를 중단한다.
    const clearRequestedAt = Date.now();

    // 진행 중인 디바운스 취소
    const existing = dbWriteTimers.current.get(bedId);
    if (existing) {
      clearTimeout(existing);
      dbWriteTimers.current.delete(bedId);
      pendingUpdates.current.delete(bedId);
    }

    const idlePayload = {
      id: bedId,
      status: 'IDLE',
      current_preset_id: null,
      custom_preset_json: null,
      current_step_index: 0,
      queue: [],
      start_time: null,
      original_duration: null,
      is_paused: false,
      is_injection: false,
      is_fluid: false,
      is_traction: false,
      is_eswt: false,
      is_manual: false,
      is_ion: false,
      is_exercise: false,
      is_injection_completed: false,
      patient_memo: null,
      updated_at: new Date().toISOString(),
    };

    // 3회까지 재시도
    for (let attempt = 0; attempt < 3; attempt++) {
      const currentBed = bedsRef.current.find(b => b.id === bedId);
      if (!currentBed) return;

      // clear 요청 이후 더 최신 로컬 변경(재시작 포함)이 있으면 stale IDLE 덮어쓰기 중단
      if (currentBed.status !== BedStatus.IDLE || (currentBed.lastUpdateTimestamp && currentBed.lastUpdateTimestamp > clearRequestedAt)) {
        return;
      }

      const { error } = await supabase.from('beds').upsert(idlePayload);
      if (!error) return;
      console.error(`[BedState] clearBed DB attempt ${attempt + 1} failed (bed ${bedId}):`, error.message);
    }
  }, []);

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
    clearBedInDb, // clearBed 전용 DB 함수
    restoreBeds,
    refreshBeds: refresh,
    broadcastClearBed,
    realtimeStatus
  };
};
