
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BedState, BedStatus } from '../types';
import { supabase, isOnlineMode } from '../lib/supabase';
import { mapRowToBed, shouldIgnoreServerUpdate, forceIdleBed } from '../utils/bedLogic';

const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const POLL_INTERVAL = 5000;

const toEpochMs = (iso?: string): number => {
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const shouldKeepLocalIdle = (localBed: BedState, serverBed: BedState): boolean => {
  if (localBed.status !== BedStatus.IDLE || serverBed.status === BedStatus.IDLE) return false;
  if (!localBed.lastUpdateTimestamp) return false;

  // 서버 updated_at이 로컬 clear 시점보다 오래됐으면 stale 이벤트/폴링으로 간주하고 차단
  const serverUpdatedAtMs = toEpochMs(serverBed.updatedAt);
  if (serverUpdatedAtMs > 0 && serverUpdatedAtMs <= localBed.lastUpdateTimestamp) return true;

  // updated_at이 없거나 신뢰할 수 없는 경우 보호 윈도우를 길게 유지해 고스트 카드 재생성 방지
  const FALLBACK_PROTECT_MS = 45 * 1000;
  return Date.now() - localBed.lastUpdateTimestamp < FALLBACK_PROTECT_MS;
};


const shouldKeepLocalActive = (localBed: BedState, serverBed: BedState): boolean => {
  if (localBed.status === BedStatus.IDLE || serverBed.status !== BedStatus.IDLE) return false;
  if (!localBed.lastUpdateTimestamp) return false;

  const serverUpdatedAtMs = toEpochMs(serverBed.updatedAt);
  if (serverUpdatedAtMs > 0 && serverUpdatedAtMs <= localBed.lastUpdateTimestamp) return true;

  // 서버가 잠깐 늦게 따라오는 동안(로그->배드 활성화 직후) 로컬 ACTIVE 보호
  const FALLBACK_PROTECT_MS = 15 * 1000;
  return Date.now() - localBed.lastUpdateTimestamp < FALLBACK_PROTECT_MS;
};
const isServerNewer = (localBed: BedState, serverBed: BedState): boolean => {
  const localUpdatedAtMs = toEpochMs(localBed.updatedAt);
  const serverUpdatedAtMs = toEpochMs(serverBed.updatedAt);
  if (localUpdatedAtMs === 0 || serverUpdatedAtMs === 0) return true;
  return serverUpdatedAtMs > localUpdatedAtMs;
};


const shouldKeepLocalProgressAfterActivation = (localBed: BedState, serverBed: BedState): boolean => {
  if (localBed.status !== BedStatus.ACTIVE || serverBed.status !== BedStatus.ACTIVE) return false;
  if (!localBed.lastUpdateTimestamp) return false;

  // 활성화 직후 짧은 구간은 서버의 지연/역전 이벤트로부터 진행 상태를 보호
  const ACTIVATION_PROTECT_MS = 20 * 1000;
  if (Date.now() - localBed.lastUpdateTimestamp > ACTIVATION_PROTECT_MS) return false;

  const serverUpdatedAtMs = toEpochMs(serverBed.updatedAt);
  const serverIsOlderThanLocalMutation = serverUpdatedAtMs > 0 && serverUpdatedAtMs <= localBed.lastUpdateTimestamp;

  const serverLooksBehindInTime =
    typeof localBed.startTime === 'number' &&
    typeof serverBed.startTime === 'number' &&
    serverBed.startTime < localBed.startTime;

  const serverJumpsStepAhead =
    typeof serverBed.currentStepIndex === 'number' &&
    typeof localBed.currentStepIndex === 'number' &&
    serverBed.currentStepIndex > localBed.currentStepIndex;

  return serverJumpsStepAhead && (serverIsOlderThanLocalMutation || serverLooksBehindInTime);
};


const shouldKeepLocalSessionAfterActivation = (localBed: BedState, serverBed: BedState): boolean => {
  if (localBed.status !== BedStatus.ACTIVE || serverBed.status === BedStatus.IDLE) return false;
  if (!localBed.lastUpdateTimestamp) return false;

  // 환자현황에서 활성화한 직후에는 이전 세션(과거 startTime) 복원이 절대 일어나지 않도록 강하게 보호
  const SESSION_GUARD_MS = 45 * 1000;
  if (Date.now() - localBed.lastUpdateTimestamp > SESSION_GUARD_MS) return false;

  if (typeof localBed.startTime !== 'number' || typeof serverBed.startTime !== 'number') return false;

  // 서버 startTime이 로컬 세션보다 과거면 stale 세션으로 간주
  return serverBed.startTime < localBed.startTime;
};
export const useBedRealtime = (
  setBeds: React.Dispatch<React.SetStateAction<BedState[]>>,
  setLocalBeds: (value: BedState[] | ((val: BedState[]) => BedState[])) => void
) => {
  const [realtimeStatus, setRealtimeStatus] = useState<'OFFLINE' | 'CONNECTING' | 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED' | 'TIMED_OUT'>('OFFLINE');
  const broadcastChannelRef = useRef<any>(null);
  const isInitialFetchDone = useRef(false);

  // ── 초기 로딩: 서버 데이터 수락 (단, 최근 비운 bed는 로컬 IDLE 보호) ──
  const initialFetch = useCallback(async () => {
    const client = supabase;
    if (!isOnlineMode() || !client) return;

    const { data, error } = await client.from('beds').select('*').order('id');
    if (error || !data) return;

    const serverBeds: BedState[] = data.map(row => mapRowToBed(row) as BedState);
    const serverBedsById = new Map(serverBeds.map((bed) => [bed.id, bed]));

    setBeds((currentBeds) => {
      const merged = currentBeds.map(localBed => {
        const serverBed = serverBedsById.get(localBed.id);
        if (!serverBed) return localBed;

        // ★ 고스트 카드 방지 (리로드 시): 로컬이 IDLE이고 서버가 비IDLE일 때
        // → clearBedInDb가 아직 반영되지 않은 stale 데이터일 수 있음
        // → localStorage에 저장된 lastUpdateTimestamp로 최근 비우기 여부 판단
        if (shouldKeepLocalIdle(localBed, serverBed)) return localBed;

        // 서버 IDLE 수신 시에도, 방금 로컬에서 활성화한 경우 stale 업데이트일 수 있어 보호
        if (serverBed.status === BedStatus.IDLE && localBed.status !== BedStatus.IDLE) {
          if (shouldKeepLocalActive(localBed, serverBed)) return localBed;
          return forceIdleBed(serverBed);
        }

        return serverBed; // 그 외에는 서버 권위
      });
      setLocalBeds(merged);
      return merged;
    });

    isInitialFetchDone.current = true;
  }, [setBeds, setLocalBeds]);

  // ── 폴링: shouldIgnoreServerUpdate 적용 (진행 중인 로컬 변경 보호) ──
  const pollBeds = useCallback(async () => {
    const client = supabase;
    if (!isOnlineMode() || !client) return;

    const { data, error } = await client.from('beds').select('*').order('id');
    if (error || !data) return;

    const serverBeds: BedState[] = data.map(row => mapRowToBed(row) as BedState);
    const serverBedsById = new Map(serverBeds.map((bed) => [bed.id, bed]));

    setBeds((currentBeds) => {
      let changed = false;
      const newBeds = currentBeds.map(localBed => {
        const serverBed = serverBedsById.get(localBed.id);
        if (!serverBed) return localBed;

        // 서버가 IDLE이어도 최근 로컬 활성화 직후면 stale일 수 있어 보호
        if (serverBed.status === BedStatus.IDLE && localBed.status !== BedStatus.IDLE) {
          if (shouldKeepLocalActive(localBed, serverBed)) return localBed;
          changed = true;
          return forceIdleBed(serverBed);
        }

        // ★ 고스트 카드 방지: 로컬이 IDLE인데 서버가 비IDLE
        // → clearBedInDb가 아직 완료되지 않은 stale 데이터일 수 있음
        // → 로컬 보호 기간(30초) 내라면 로컬 IDLE 유지
        if (localBed.status === BedStatus.IDLE && serverBed.status !== BedStatus.IDLE) {
          if (shouldKeepLocalIdle(localBed, serverBed)) return localBed;
          // 보호 기간 지남 → 서버 데이터 수락 (정상적인 다른 디바이스 활성화)
          changed = true;
          return serverBed;
        }

        // 활성화 직후 이전 세션(startTime이 더 과거) 복원 차단
        if (shouldKeepLocalSessionAfterActivation(localBed, serverBed)) return localBed;

        // 활성화 직후 서버가 마지막 스텝 등으로 점프시키는 stale 업데이트 보호
        if (shouldKeepLocalProgressAfterActivation(localBed, serverBed)) return localBed;

        // 로컬에서 최근 변경한 bed는 보호
        if (shouldIgnoreServerUpdate(localBed, serverBed)) return localBed;

        // 메모 변경은 상태가 같아도 즉시 동기화
        if (localBed.patientMemo !== serverBed.patientMemo) {
          changed = true;
          return serverBed;
        }

        // 상태가 달라졌거나 서버 데이터가 더 최신이면 서버 수락 (디바이스간 연동)
        if (localBed.status !== serverBed.status || isServerNewer(localBed, serverBed)) {
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

            // 서버가 IDLE로 내려와도, 방금 로컬에서 ACTIVE 전환한 직후라면 stale 이벤트일 수 있어 보호
            if (updatedBed.status === BedStatus.IDLE) {
              if (shouldKeepLocalActive(bed, updatedBed as BedState)) return bed;
              return forceIdleBed({ ...bed });
            }

            // 활성화 직후 이전 세션(startTime이 더 과거) 복원 차단
            if (shouldKeepLocalSessionAfterActivation(bed, updatedBed as BedState)) return bed;

            // 활성화 직후 서버가 마지막 스텝 등으로 점프시키는 stale 업데이트 보호
            if (shouldKeepLocalProgressAfterActivation(bed, updatedBed as BedState)) return bed;

            // 로컬 변경 보호
            if (shouldIgnoreServerUpdate(bed, updatedBed)) return bed;
            if (bed.patientMemo !== updatedBed.patientMemo) {
              return { ...bed, ...updatedBed };
            }

            // ★ 고스트 카드 방지: 로컬이 IDLE인데 서버 이벤트가 비IDLE
            // → clearBedInDb 전의 stale 이벤트일 수 있음 (보호 기간 30초)
            if (shouldKeepLocalIdle(bed, updatedBed as BedState)) return bed;

            const serverIsNewer = isServerNewer(bed, updatedBed as BedState);

            // 상태가 다르더라도 서버 이벤트가 로컬보다 오래되면 무시 (ACTIVE→COMPLETED/IDLE 튐 방지)
            if (updatedBed.status !== bed.status && !serverIsNewer) {
              if (bed.lastUpdateTimestamp) {
                const serverUpdatedAtMs = toEpochMs((updatedBed as BedState).updatedAt);
                if (serverUpdatedAtMs > 0 && serverUpdatedAtMs <= bed.lastUpdateTimestamp) {
                  return bed;
                }
              }
            }

            if (!serverIsNewer && bed.status === updatedBed.status) return bed;
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
