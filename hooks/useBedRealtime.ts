
import React, { useState, useEffect, useCallback } from 'react';
import { BedState, BedStatus } from '../types';
import { supabase, isOnlineMode } from '../lib/supabase';
import { mapRowToBed, shouldIgnoreServerUpdate } from '../utils/bedLogic';

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
          if (localBed && shouldIgnoreServerUpdate(localBed, serverBed)) return localBed;
          return serverBed;
        });
        setLocalBeds(newBeds); // Sync local storage
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

              if (!isServerClearingBed) {
                if (shouldIgnoreServerUpdate(bed, updatedBedFields)) return bed;

                if (bed.status === BedStatus.IDLE && updatedBedFields.status === BedStatus.ACTIVE) {
                  const timeSinceClear = Date.now() - (bed.lastUpdateTimestamp || 0);
                  if (timeSinceClear < 2000) return bed; // 2s debounce
                }
              }

              const mergedBed = { ...bed, ...updatedBedFields };

              // IDLE 상태로 전환이 아닐 때만 로컬 patientMemo 보존
              // (침상 비우기로 IDLE이 되면 메모도 지워져야 함)
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
                mergedBed.remainingTime = 0;
                mergedBed.customPreset = undefined;
                mergedBed.currentPresetId = null;
                mergedBed.queue = [];
                mergedBed.patientMemo = undefined;
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
        setRealtimeStatus(status as any);
      });

    return () => { client.removeChannel(channel); };
  }, [setBeds, setLocalBeds, fetchBeds]);

  return { realtimeStatus, refresh: fetchBeds };
};
