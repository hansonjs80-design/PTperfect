import { useCallback, useMemo } from 'react';
import { BedState, BedStatus, PatientVisit } from '../types';

const getLocalISODate = (): string => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
};

const getVisitTimestamp = (visit: PatientVisit) => {
  // Row activation/latest selection must follow log order (created_at),
  // not arbitrary text edits that only bump updated_at.
  return new Date(visit.created_at || visit.updated_at || 0).getTime();
};

export const useBedPatientFields = (beds: BedState[], visits: PatientVisit[]) => {
  const todayDate = getLocalISODate();

  const latestTodayVisitByBed = useMemo(() => {
    const map = new Map<number, PatientVisit>();

    for (const visit of visits) {
      if (!visit.bed_id || visit.visit_date !== todayDate) continue;

      const prev = map.get(visit.bed_id);
      if (!prev || getVisitTimestamp(visit) >= getVisitTimestamp(prev)) {
        map.set(visit.bed_id, visit);
      }
    }

    return map;
  }, [visits, todayDate]);

  const getLatestVisitForBed = useCallback((bedId: number, allVisits: PatientVisit[]) => {
    // Fast path for the common case used across app (current visits array)
    if (allVisits === visits) {
      return latestTodayVisitByBed.get(bedId);
    }

    // Fallback path for callers passing an arbitrary visits snapshot
    let latest: PatientVisit | undefined;
    for (const visit of allVisits) {
      if (visit.bed_id !== bedId || visit.visit_date !== todayDate) continue;
      if (!latest || getVisitTimestamp(visit) >= getVisitTimestamp(latest)) {
        latest = visit;
      }
    }
    return latest;
  }, [latestTodayVisitByBed, todayDate, visits]);

  const bedPatientNames = useMemo(() => {
    const map: Record<number, string> = {};

    beds.forEach((bed) => {
      if (!bed.id || bed.status === BedStatus.IDLE) return;

      const latestVisit = latestTodayVisitByBed.get(bed.id);
      const patientName = latestVisit?.patient_name?.trim();
      if (patientName) map[bed.id] = patientName;
    });

    return map;
  }, [beds, latestTodayVisitByBed]);

  const bedPatientBodyParts = useMemo(() => {
    const map: Record<number, string> = {};

    beds.forEach((bed) => {
      if (!bed.id || bed.status === BedStatus.IDLE) return;

      const latestVisit = latestTodayVisitByBed.get(bed.id);
      const bodyPart = latestVisit?.body_part?.trim();
      if (bodyPart) map[bed.id] = bodyPart;
    });

    return map;
  }, [beds, latestTodayVisitByBed]);

  return {
    bedPatientNames,
    bedPatientBodyParts,
    getLatestVisitForBed,
  };
};
