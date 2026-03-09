import { useEffect, useMemo, useRef } from 'react';
import { BedState, BedStatus, PatientVisit } from '../types';

const getVisitTimestamp = (visit: PatientVisit) => new Date(visit.created_at || 0).getTime();

const buildLatestVisitMap = (visits: PatientVisit[], currentDate: string) => {
  const map = new Map<number, PatientVisit>();
  for (const visit of visits) {
    if (!visit.bed_id || visit.visit_date !== currentDate) continue;
    const prev = map.get(visit.bed_id);
    if (!prev || getVisitTimestamp(visit) >= getVisitTimestamp(prev)) {
      map.set(visit.bed_id, visit);
    }
  }
  return map;
};

interface UseActiveBedStabilityParams {
  beds: BedState[];
  visits: PatientVisit[];
  currentDate: string;
  clearBed: (bedId: number) => void;
  updateBedMemoFromLog: (bedId: number, memo?: string) => void;
}

export const useActiveBedStability = ({
  beds,
  visits,
  currentDate,
  clearBed,
  updateBedMemoFromLog,
}: UseActiveBedStabilityParams) => {
  const staleCleanupRef = useRef<Map<number, number>>(new Map());
  const missingSinceRef = useRef<Map<number, number>>(new Map());

  const latestVisitByBed = useMemo(() => buildLatestVisitMap(visits, currentDate), [visits, currentDate]);

  // Keep bed memo synced with latest log memo (O(visits + beds), no per-bed sort).
  useEffect(() => {
    beds.forEach((bed) => {
      if (!bed.id || bed.status !== BedStatus.ACTIVE) return;
      const latest = latestVisitByBed.get(bed.id);
      if (!latest) return;

      const latestVisitTs = getVisitTimestamp(latest);
      if (bed.startTime && latestVisitTs > 0 && latestVisitTs + 5000 < bed.startTime) return;

      const latestMemo = latest.memo || undefined;
      const currentMemo = bed.patientMemo || undefined;
      if (latestMemo !== currentMemo) {
        updateBedMemoFromLog(bed.id, latestMemo);
      }
    });
  }, [beds, latestVisitByBed, updateBedMemoFromLog]);

  // Conservative stale guard: clear only after sustained missing-log duration.
  useEffect(() => {
    const now = Date.now();
    const LOCAL_START_GRACE_MS = 120000;
    const MISSING_VISIT_DURATION_TO_CLEAR_MS = 45000;
    const CLEAR_THROTTLE_MS = 8000;

    beds.forEach((bed) => {
      if (!bed.id || bed.status === BedStatus.IDLE) {
        if (bed?.id) missingSinceRef.current.delete(bed.id);
        return;
      }

      const localSessionTs = bed.lastUpdateTimestamp || bed.startTime || 0;
      const localAge = localSessionTs > 0 ? now - localSessionTs : Number.MAX_SAFE_INTEGER;
      if (localAge < LOCAL_START_GRACE_MS) {
        missingSinceRef.current.delete(bed.id);
        return;
      }

      const latestVisit = latestVisitByBed.get(bed.id);
      if (latestVisit) {
        missingSinceRef.current.delete(bed.id);
        return;
      }

      const missingSince = missingSinceRef.current.get(bed.id) ?? now;
      missingSinceRef.current.set(bed.id, missingSince);
      if (now - missingSince < MISSING_VISIT_DURATION_TO_CLEAR_MS) return;

      const lastClearedAt = staleCleanupRef.current.get(bed.id) || 0;
      if (now - lastClearedAt < CLEAR_THROTTLE_MS) return;

      staleCleanupRef.current.set(bed.id, now);
      clearBed(bed.id);
    });
  }, [beds, latestVisitByBed, currentDate, clearBed]);
};
