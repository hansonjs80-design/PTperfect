
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BedState, BedStatus } from '../types';
import { supabase, isOnlineMode } from '../lib/supabase';
import { mapRowToBed, shouldIgnoreServerUpdate } from '../utils/bedLogic';

/** IDLE 전환 시 bed를 완전 초기화 */
const forceIdleBed = (bed: Partial<BedState>): Partial<BedState> => ({
  ...bed,
  status: BedStatus.IDLE,
  remainingTime: 0,
  customPreset: undefined,
  currentPresetId: null,
  currentStepIndex: 0,
  queue: [],
  startTime: null,
  isPaused: false,
  isInjection: false,
  isFluid: false,
  isTraction: false,
  isESWT: false,
  isManual: false,
  isInjectionCompleted: false,
  patientMemo: undefined,
  originalDuration: undefined,
  lastUpdateTimestamp: undefined,
});

/** 고유 탭 ID (같은 브라우저의 자기 자신 브로드캐스트 무시용) */
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const useBedRealtime = (
  setBeds: React.Dispatch<React.SetStateAction<BedState[]>>,
  setLocalBeds: (value: BedState[] | ((val: BedState[]) => BedState[])) => void
) => {
  const [realtimeStatus, setRealtimeStatus] = useState<'OFFLINE' | 'CONNECTING' | 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED' | 'TIMED_OUT'>('OFFLINE');
  const broadcastChannelRef = useRef<any>(null);

  // ── DB에서 bed 상태 가져오기 ──
  const fetchBeds = useCallback(async () => {
    const client = supabase;
    if (!isOnlineMode() || !client) {
      setRealtimeStatus('OFFLINE');
      return;
    }

    const { data, error } = await client.from('beds').select('*').order('id');
    if (!error && data) {
      const serverBeds: BedState[] = data.map(row => mapRowToBed(row) as BedState);
      setBeds((currentBeds) => {
        const newBeds = serverBeds.map(serverBed => {
          const localBed = currentBeds.find(b => b.id === serverBed.id);
          if (!localBed) return serverBed;

          // 서버가 IDLE이면 무조건 수락
          if (serverBed.status === BedStatus.IDLE && localBed.status !== BedStatus.IDLE) {
            console.log(`[Realtime:fetch] Bed ${serverBed.id}: 서버 IDLE → 수락`);
            return forceIdleBed(serverBed) as BedState;
          }
          // 서버와 로컬 모두 IDLE이면 서버 수락
          if (serverBed.status === BedStatus.IDLE && localBed.status === BedStatus.IDLE) {
            return serverBed;
          }

          if (shouldIgnoreServerUpdate(localBed, serverBed)) return localBed;
          return serverBed;
        });
        setLocalBeds(newBeds);
        return newBeds;
      });
    }
  }, [setBeds, setLocalBeds]);

  // ── 특정 bed를 IDLE로 강제 초기화 ──
  const handleBedClear = useCallback((bedId: number) => {
    console.log(`[Realtime:broadcast] Bed ${bedId}: 비우기 브로드캐스트 수신 → IDLE 강제 적용`);
    setBeds((prev) => {
      const newBeds = prev.map((bed) => {
        if (bed.id === bedId && bed.status !== BedStatus.IDLE) {
          return forceIdleBed({ ...bed, id: bed.id }) as BedState;
        }
        return bed;
      });
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

    // ══════ 1. postgres_changes (기존) ══════
    const pgChannel = client
      .channel('public:beds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, (payload) => {
        const updatedBedFields = mapRowToBed(payload.new);
        console.log(`[Realtime:pg] Bed ${updatedBedFields.id}: 이벤트 수신, status=${updatedBedFields.status}`);

        setBeds((prev) => {
          const newBeds = prev.map((bed) => {
            if (bed.id === updatedBedFields.id) {
              const isServerClearingBed = updatedBedFields.status === BedStatus.IDLE && bed.status !== BedStatus.IDLE;

              if (isServerClearingBed) {
                console.log(`[Realtime:pg] Bed ${bed.id}: IDLE 전환 → forceIdleBed`);
                return forceIdleBed({ ...bed, id: bed.id }) as BedState;
              }

              if (!isServerClearingBed) {
                if (shouldIgnoreServerUpdate(bed, updatedBedFields)) return bed;
                if (bed.status === BedStatus.IDLE && updatedBedFields.status === BedStatus.ACTIVE) {
                  const timeSinceClear = Date.now() - (bed.lastUpdateTimestamp || 0);
                  if (timeSinceClear < 2000) return bed;
                }
              }

              const mergedBed = { ...bed, ...updatedBedFields };

              if (updatedBedFields.status !== BedStatus.IDLE && !updatedBedFields.patientMemo && bed.patientMemo) {
                mergedBed.patientMemo = bed.patientMemo;
              }

              const isTargetActive = mergedBed.status !== BedStatus.IDLE;
              const hasLocalPrescription = !!bed.customPreset || !!bed.currentPresetId;
              const serverHasNoPrescription = !mergedBed.customPreset && !mergedBed.currentPresetId;

              if (isTargetActive && hasLocalPrescription && serverHasNoPrescription) {
                mergedBed.customPreset = bed.customPreset;
                mergedBed.currentPresetId = bed.currentPresetId;
                mergedBed.queue = bed.queue;
                mergedBed.remainingTime = bed.remainingTime;
              }

              if (mergedBed.status === BedStatus.IDLE) {
                return forceIdleBed({ ...mergedBed, id: bed.id }) as BedState;
              }

              return mergedBed;
            }
            return bed;
          });

          setLocalBeds(newBeds);
          return newBeds;
        });
      })
      .subscribe((status) => {
        console.log(`[Realtime:pg] Channel status: ${status}`);
        setRealtimeStatus(status as any);
      });

    // ══════ 2. Broadcast 채널 (침상 비우기 전용) ══════
    const bcChannel = client
      .channel('bed-actions')
      .on('broadcast', { event: 'clear-bed' }, (payload: any) => {
        const { bedId, senderId } = payload.payload || {};
        // 자기 자신이 보낸 이벤트는 무시
        if (senderId === TAB_ID) return;
        if (bedId) handleBedClear(bedId);
      })
      .subscribe((status) => {
        console.log(`[Realtime:broadcast] Channel status: ${status}`);
      });

    broadcastChannelRef.current = bcChannel;

    // ══════ 3. 폴링 백업 (10초마다) ══════
    const pollInterval = setInterval(() => {
      fetchBeds();
    }, 10000);

    return () => {
      client.removeChannel(pgChannel);
      client.removeChannel(bcChannel);
      clearInterval(pollInterval);
      broadcastChannelRef.current = null;
    };
  }, [setBeds, setLocalBeds, fetchBeds, handleBedClear]);

  // ── broadcastClearBed: clearBed 시 다른 디바이스에 알림 ──
  const broadcastClearBed = useCallback((bedId: number) => {
    const bc = broadcastChannelRef.current;
    if (bc) {
      console.log(`[Realtime:broadcast] Bed ${bedId}: 비우기 브로드캐스트 전송`);
      bc.send({
        type: 'broadcast',
        event: 'clear-bed',
        payload: { bedId, senderId: TAB_ID }
      });
    }
  }, []);

  return { realtimeStatus, refresh: fetchBeds, broadcastClearBed };
};
