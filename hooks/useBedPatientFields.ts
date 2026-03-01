import { useCallback, useMemo } from 'react';
import { BedState, BedStatus, PatientVisit } from '../types';


const getLocalISODate = (): string => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
};

export const useBedPatientFields = (beds: BedState[], visits: PatientVisit[]) => {
  const todayDate = getLocalISODate();
  const getVisitCreatedTimestamp = useCallback((visit: PatientVisit) => {
    return new Date(visit.created_at || visit.updated_at || 0).getTime();
  }, []);

  const getVisitsForBed = useCallback((bedId: number, allVisits: PatientVisit[]) => {
    return allVisits
      .filter((visit) => visit.bed_id === bedId && visit.visit_date === todayDate)
      .sort((a, b) => getVisitCreatedTimestamp(a) - getVisitCreatedTimestamp(b));
  }, [getVisitCreatedTimestamp, todayDate]);

  const getLatestVisitForBed = useCallback((bedId: number, allVisits: PatientVisit[]) => {
    const visitsForBed = getVisitsForBed(bedId, allVisits);
    return visitsForBed[visitsForBed.length - 1];
  }, [getVisitsForBed]);


  const bedPatientNames = useMemo(() => {
    const map: Record<number, string> = {};

    beds.forEach((bed) => {
      if (!bed.id || bed.status === BedStatus.IDLE) return;

      const latestVisit = getLatestVisitForBed(bed.id, visits);
      const patientName = latestVisit?.patient_name?.trim();
      if (patientName) map[bed.id] = patientName;
    });

    return map;
  }, [beds, visits, getLatestVisitForBed]);

  const bedPatientBodyParts = useMemo(() => {
    const map: Record<number, string> = {};

    beds.forEach((bed) => {
      if (!bed.id || bed.status === BedStatus.IDLE) return;

      const latestVisit = getLatestVisitForBed(bed.id, visits);
      const bodyPart = latestVisit?.body_part?.trim();
      if (bodyPart) map[bed.id] = bodyPart;
    });

    return map;
  }, [beds, visits, getLatestVisitForBed]);

  return {
    bedPatientNames,
    bedPatientBodyParts,
    getLatestVisitForBed,
  };
};
