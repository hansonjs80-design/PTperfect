import { useCallback, useMemo } from 'react';
import { BedState, BedStatus, PatientVisit } from '../types';

export const useBedPatientFields = (beds: BedState[], visits: PatientVisit[]) => {
  const getVisitCreatedTimestamp = useCallback((visit: PatientVisit) => {
    return new Date(visit.created_at || visit.updated_at || 0).getTime();
  }, []);

  const getVisitsForBed = useCallback((bedId: number, allVisits: PatientVisit[]) => {
    return allVisits
      .filter((visit) => visit.bed_id === bedId)
      .sort((a, b) => getVisitCreatedTimestamp(a) - getVisitCreatedTimestamp(b));
  }, [getVisitCreatedTimestamp]);

  const getLatestVisitForBed = useCallback((bedId: number, allVisits: PatientVisit[]) => {
    const visitsForBed = getVisitsForBed(bedId, allVisits);
    return visitsForBed[visitsForBed.length - 1];
  }, [getVisitsForBed]);

  const getLatestNonEmptyVisitField = useCallback(
    (bedId: number, allVisits: PatientVisit[], field: 'patient_name' | 'body_part') => {
      const visitsForBed = getVisitsForBed(bedId, allVisits);
      for (let i = visitsForBed.length - 1; i >= 0; i -= 1) {
        const value = visitsForBed[i][field]?.trim();
        if (value) return value;
      }
      return undefined;
    },
    [getVisitsForBed]
  );

  const bedPatientNames = useMemo(() => {
    const map: Record<number, string> = {};

    beds.forEach((bed) => {
      if (!bed.id || bed.status === BedStatus.IDLE) return;

      const patientName = getLatestNonEmptyVisitField(bed.id, visits, 'patient_name');
      if (patientName) map[bed.id] = patientName;
    });

    return map;
  }, [beds, visits, getLatestNonEmptyVisitField]);

  const bedPatientBodyParts = useMemo(() => {
    const map: Record<number, string> = {};

    beds.forEach((bed) => {
      if (!bed.id || bed.status === BedStatus.IDLE) return;

      const bodyPart = getLatestNonEmptyVisitField(bed.id, visits, 'body_part');
      if (bodyPart) map[bed.id] = bodyPart;
    });

    return map;
  }, [beds, visits, getLatestNonEmptyVisitField]);

  return {
    bedPatientNames,
    bedPatientBodyParts,
    getLatestVisitForBed,
  };
};
