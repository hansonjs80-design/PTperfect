
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BedState, BedStatus } from '../types';
import { supabase, isOnlineMode } from '../lib/supabase';
import { mapRowToBed, shouldIgnoreServerUpdate, forceIdleBed } from '../utils/bedLogic';

/** 고유 탭 ID (자기 자신 브로드캐스트 무시용) */
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** 폴링 간격 (ms) */
const POLL_INTERVAL = 5000;

export const useBedRealtime = (
  setBeds: React.Dispatch<React.SetStateAction<BedState[]>>,
  setLocalBeds: (value: BedState[] | ((val: BedState[]) => BedState[])) => void
) => {
  const [realtimeStatus, setRealtimeStatus] = useState<'OFFLINE' | 'CONNECTING' | 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED' | 'TIMED_OUT'>('OFFLINE');
  const broadcastChannelRef = useRef<any>(null);

  // ── DB에서 bed 상태 가져오기 ──
  const fetchBeds = useCallback(async () => {
    const client = supabase;
    if (!isOnlineMode() || !client) return;

    const { data, error } = await client.from('beds').select('*').order('id');
    if (error || !data) return;

    const serverBeds: BedState[] = data.map(row => mapRowToBed(row) as BedState);
    setBeds((currentBeds) => {
      const newBeds = serverBeds.map(serverBed => {
        const localBed = currentBeds.find(b => b.id === serverBed.id);
        if (!localBed) return serverBed;

        // 서버가 IDLE이고 로컬이 아직 ACTIVE → 무조건 비우기
        if (serverBed.status === BedStatus.IDLE && localBed.status !== BedStatus.IDLE) {
          return forceIdleBed(serverBed);
        }

        // 로컬 timestamp 기반 충돌 해결
        if (shouldIgnoreServerUpdate(localBed, serverBed)) return localBed;
        return serverBed;
      });
      setLocalBeds(newBeds);
      return newBeds;
    });
  }, [setBeds, setLocalBeds]);

  // ── Broadcast 수신: 특정 bed IDLE 처리 ──
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
    fetchBeds();

    // ── 1. postgres_changes ──
    const pgChannel = client
      .channel('public:beds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, (payload) => {
        const updatedBed = mapRowToBed(payload.new);

        setBeds((prev) => {
          const newBeds = prev.map((bed) => {
            if (bed.id !== updatedBed.id) return bed;

            // IDLE 전환은 무조건 수락
            if (updatedBed.status === BedStatus.IDLE) {
              return forceIdleBed({ ...bed });
            }

            if (shouldIgnoreServerUpdate(bed, updatedBed)) return bed;

            // IDLE→비IDLE 디바운스 (2초)
            if (bed.status === BedStatus.IDLE) {
              if (Date.now() - (bed.lastUpdateTimestamp || 0) < 2000) return bed;
            }

            const merged = { ...bed, ...updatedBed };
            // 로컬 memo/처방 보존 (이 시점에서 updatedBed는 비IDLE)
            if (!updatedBed.patientMemo && bed.patientMemo) {
              merged.patientMemo = bed.patientMemo;
            }
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

    // ── 2. Broadcast 채널 (침상 비우기 전용) ──
    const bcChannel = client
      .channel('bed-actions')
      .on('broadcast', { event: 'clear-bed' }, (payload: any) => {
        const { bedId, senderId } = payload.payload || {};
        if (senderId === TAB_ID) return;
        if (bedId) handleBedClear(bedId);
      })
      .subscribe();

    broadcastChannelRef.current = bcChannel;

    // ── 3. 폴링 (5초) ──
    const poll = setInterval(fetchBeds, POLL_INTERVAL);

    return () => {
      client.removeChannel(pgChannel);
      client.removeChannel(bcChannel);
      clearInterval(poll);
      broadcastChannelRef.current = null;
    };
  }, [setBeds, setLocalBeds, fetchBeds, handleBedClear]);

  // ── 비우기 브로드캐스트 전송 ──
  const broadcastClearBed = useCallback((bedId: number) => {
    broadcastChannelRef.current?.send({
      type: 'broadcast',
      event: 'clear-bed',
      payload: { bedId, senderId: TAB_ID }
    });
  }, []);

  return { realtimeStatus, refresh: fetchBeds, broadcastClearBed };
};
