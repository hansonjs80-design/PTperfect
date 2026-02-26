
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BedState, BedStatus } from '../types';
import { supabase, isOnlineMode } from '../lib/supabase';
import { mapRowToBed, shouldIgnoreServerUpdate, forceIdleBed } from '../utils/bedLogic';

const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const POLL_INTERVAL = 5000;

export const useBedRealtime = (
  setBeds: React.Dispatch<React.SetStateAction<BedState[]>>,
  setLocalBeds: (value: BedState[] | ((val: BedState[]) => BedState[])) => void
) => {
  const [realtimeStatus, setRealtimeStatus] = useState<'OFFLINE' | 'CONNECTING' | 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED' | 'TIMED_OUT'>('OFFLINE');
  const broadcastChannelRef = useRef<any>(null);
  const isInitialFetchDone = useRef(false);

  // ── 초기 로딩: 서버 데이터 100% 수락 (shouldIgnoreServerUpdate 적용 안함) ──
  const initialFetch = useCallback(async () => {
    const client = supabase;
    if (!isOnlineMode() || !client) return;

    const { data, error } = await client.from('beds').select('*').order('id');
    if (error || !data) return;

    const serverBeds: BedState[] = data.map(row => mapRowToBed(row) as BedState);
    // 서버 데이터를 무조건 적용 — localStorage 캐시보다 서버가 항상 권위
    setBeds(serverBeds);
    setLocalBeds(serverBeds);
    isInitialFetchDone.current = true;
  }, [setBeds, setLocalBeds]);

  // ── 폴링: shouldIgnoreServerUpdate 적용 (진행 중인 로컬 변경 보호) ──
  const pollBeds = useCallback(async () => {
    const client = supabase;
    if (!isOnlineMode() || !client) return;

    const { data, error } = await client.from('beds').select('*').order('id');
    if (error || !data) return;

    const serverBeds: BedState[] = data.map(row => mapRowToBed(row) as BedState);
    setBeds((currentBeds) => {
      let changed = false;
      const newBeds = serverBeds.map(serverBed => {
        const localBed = currentBeds.find(b => b.id === serverBed.id);
        if (!localBed) { changed = true; return serverBed; }

        // 서버가 IDLE이고 로컬이 아직 비IDLE → 무조건 비우기
        if (serverBed.status === BedStatus.IDLE && localBed.status !== BedStatus.IDLE) {
          changed = true;
          return forceIdleBed(serverBed);
        }

        // 로컬에서 최근 변경한 bed는 보호
        if (shouldIgnoreServerUpdate(localBed, serverBed)) return localBed;

        // 상태가 달라졌으면 서버 수락
        if (localBed.status !== serverBed.status) {
          changed = true;
          return serverBed;
        }

        return localBed; // 변경 없으면 로컬 유지 (리렌더 방지)
      });
      if (!changed) return currentBeds;
      setLocalBeds(newBeds);
      return newBeds;
    });
  }, [setBeds, setLocalBeds]);

  // ── Broadcast 수신 ──
  const handleBedClear = useCallback((bedId: number) => {
    setBeds((prev) => {
      const newBeds = prev.map((bed) =>
        bed.id === bedId && bed.status !== BedStatus.IDLE
          ? forceIdleBed({ ...bed })
          : bed
      );
      setLocalBeds(newBeds);
      return newBeds;
    });
  }, [setBeds, setLocalBeds]);

  useEffect(() => {
    const client = supabase;
    if (!isOnlineMode() || !client) {
      setRealtimeStatus('OFFLINE');
      return;
    }

    setRealtimeStatus('CONNECTING');

    // 초기 fetch — 서버 데이터 100% 수락
    initialFetch();

    // postgres_changes
    const pgChannel = client
      .channel('public:beds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, (payload) => {
        const updatedBed = mapRowToBed(payload.new);
        setBeds((prev) => {
          const newBeds = prev.map((bed) => {
            if (bed.id !== updatedBed.id) return bed;
            if (updatedBed.status === BedStatus.IDLE) return forceIdleBed({ ...bed });
            if (shouldIgnoreServerUpdate(bed, updatedBed)) return bed;
            if (bed.status === BedStatus.IDLE && Date.now() - (bed.lastUpdateTimestamp || 0) < 2000) return bed;
            const merged = { ...bed, ...updatedBed };
            if (!updatedBed.patientMemo && bed.patientMemo) merged.patientMemo = bed.patientMemo;
            if (merged.status !== BedStatus.IDLE && (!!bed.customPreset || !!bed.currentPresetId) && !merged.customPreset && !merged.currentPresetId) {
              merged.customPreset = bed.customPreset;
              merged.currentPresetId = bed.currentPresetId;
              merged.queue = bed.queue;
              merged.remainingTime = bed.remainingTime;
            }
            return merged;
          });
          setLocalBeds(newBeds);
          return newBeds;
        });
      })
      .subscribe((status) => setRealtimeStatus(status as any));

    // Broadcast 채널
    const bcChannel = client
      .channel('bed-actions')
      .on('broadcast', { event: 'clear-bed' }, (payload: any) => {
        const { bedId, senderId } = payload.payload || {};
        if (senderId === TAB_ID) return;
        if (bedId) handleBedClear(bedId);
      })
      .subscribe();

    broadcastChannelRef.current = bcChannel;

    // 폴링 (5초) — shouldIgnoreServerUpdate 적용
    const poll = setInterval(pollBeds, POLL_INTERVAL);

    return () => {
      client.removeChannel(pgChannel);
      client.removeChannel(bcChannel);
      clearInterval(poll);
      broadcastChannelRef.current = null;
    };
  }, [setBeds, setLocalBeds, initialFetch, pollBeds, handleBedClear]);

  const broadcastClearBed = useCallback((bedId: number) => {
    broadcastChannelRef.current?.send({
      type: 'broadcast',
      event: 'clear-bed',
      payload: { bedId, senderId: TAB_ID }
    });
  }, []);

  return { realtimeStatus, refresh: initialFetch, broadcastClearBed };
};
