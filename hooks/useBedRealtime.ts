
import React, { useState, useEffect, useCallback } from 'react';
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
  lastUpdateTimestamp: undefined, // 리셋하여 이후 서버 업데이트 수락 보장
});

export const useBedRealtime = (
  setBeds: React.Dispatch<React.SetStateAction<BedState[]>>,
  setLocalBeds: (value: BedState[] | ((val: BedState[]) => BedState[])) => void
) => {
  const [realtimeStatus, setRealtimeStatus] = useState<'OFFLINE' | 'CONNECTING' | 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED' | 'TIMED_OUT'>('OFFLINE');

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

          // IDLE 전환은 절대 무시하지 않음
          const isServerClearing = serverBed.status === BedStatus.IDLE && localBed.status !== BedStatus.IDLE;
          if (isServerClearing) {
            console.log(`[Realtime:fetch] Bed ${serverBed.id}: 서버 IDLE 전환 수락 (로컬: ${localBed.status})`);
            return forceIdleBed(serverBed) as BedState;
          }

          if (shouldIgnoreServerUpdate(localBed, serverBed)) return localBed;
          return serverBed;
        });
        setLocalBeds(newBeds);
        return newBeds;
      });
    }
  }, [setBeds, setLocalBeds]);

  useEffect(() => {
    const client = supabase;
    if (!isOnlineMode() || !client) {
      setRealtimeStatus('OFFLINE');
      return;
    }

    setRealtimeStatus('CONNECTING');

    // Initial Fetch
    fetchBeds();

    const channel = client
      .channel('public:beds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, (payload) => {
        const updatedBedFields = mapRowToBed(payload.new);

        setBeds((prev) => {
          const newBeds = prev.map((bed) => {
            if (bed.id === updatedBedFields.id) {
              // IDLE 전환(침상 비우기)은 shouldIgnoreServerUpdate/디바운스 건너뛰기 — 즉시 반영
              const isServerClearingBed = updatedBedFields.status === BedStatus.IDLE && bed.status !== BedStatus.IDLE;

              if (isServerClearingBed) {
                console.log(`[Realtime] Bed ${bed.id}: 서버 IDLE 전환 수락 (로컬: ${bed.status})`);
              }

              if (!isServerClearingBed) {
                if (shouldIgnoreServerUpdate(bed, updatedBedFields)) return bed;

                if (bed.status === BedStatus.IDLE && updatedBedFields.status === BedStatus.ACTIVE) {
                  const timeSinceClear = Date.now() - (bed.lastUpdateTimestamp || 0);
                  if (timeSinceClear < 2000) return bed; // 2s debounce
                }
              }

              // IDLE 전환인 경우 forceIdleBed로 완전 초기화
              if (isServerClearingBed) {
                return forceIdleBed({ ...bed, id: bed.id }) as BedState;
              }

              const mergedBed = { ...bed, ...updatedBedFields };

              // IDLE 상태로 전환이 아닐 때만 로컬 patientMemo 보존
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

              // 서버 상태가 IDLE인 경우 (예: 서버가 IDLE→IDLE일 때도 처리)
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
        console.log(`[Realtime] Channel status: ${status}`);
        setRealtimeStatus(status as any);
      });

    return () => { client.removeChannel(channel); };
  }, [setBeds, setLocalBeds, fetchBeds]);

  return { realtimeStatus, refresh: fetchBeds };
};
