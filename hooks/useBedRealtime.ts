
import React, { useState, useEffect } from 'react';
import { BedState, BedStatus } from '../types';
import { supabase, isOnlineMode } from '../lib/supabase';
import { mapRowToBed, shouldIgnoreServerUpdate } from '../utils/bedLogic';

export const useBedRealtime = (
  setBeds: React.Dispatch<React.SetStateAction<BedState[]>>,
  setLocalBeds: (value: BedState[] | ((val: BedState[]) => BedState[])) => void
) => {
  const [realtimeStatus, setRealtimeStatus] = useState<'OFFLINE' | 'CONNECTING' | 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED' | 'TIMED_OUT'>('OFFLINE');

  useEffect(() => {
    const client = supabase;
    if (!isOnlineMode() || !client) {
      setRealtimeStatus('OFFLINE');
      return;
    }

    setRealtimeStatus('CONNECTING');

    const fetchBeds = async () => {
      const { data, error } = await client.from('beds').select('*').order('id');
      if (!error && data) {
        const serverBeds: BedState[] = data.map(row => mapRowToBed(row) as BedState);
        setBeds((currentBeds) => {
          return serverBeds.map(serverBed => {
            const localBed = currentBeds.find(b => b.id === serverBed.id);
            if (localBed && shouldIgnoreServerUpdate(localBed, serverBed)) return localBed;
            return serverBed;
          });
        });
      }
    };

    fetchBeds();

    const channel = client
      .channel('public:beds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, (payload) => {
        const updatedBedFields = mapRowToBed(payload.new);
        
        setBeds((prev) => {
          const newBeds = prev.map((bed) => {
            if (bed.id === updatedBedFields.id) {
              if (shouldIgnoreServerUpdate(bed, updatedBedFields)) return bed;
              
              if (bed.status === BedStatus.IDLE && updatedBedFields.status === BedStatus.ACTIVE) {
                 const timeSinceClear = Date.now() - (bed.lastUpdateTimestamp || 0);
                 if (timeSinceClear < 10000) return bed; 
              }

              const mergedBed = { ...bed, ...updatedBedFields };
              
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
  }, [setBeds, setLocalBeds]);

  return { realtimeStatus };
};
