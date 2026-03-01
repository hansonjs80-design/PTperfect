
import React, { useCallback } from 'react';
import { BedState, BedStatus, PatientVisit, Preset, QuickTreatment } from '../types';
import { useBedIntegration } from './useBedIntegration';

export const usePatientBedSync = (
  bedsRef: React.MutableRefObject<BedState[]>,
  visitsRef: React.MutableRefObject<PatientVisit[]>,
  updateLogVisit: (id: string, updates: Partial<PatientVisit>) => void,
  clearBed: (id: number) => void,
  bedIntegration: ReturnType<typeof useBedIntegration>
) => {
  const { overrideBedFromLog, moveBedState, updateBedMemoFromLog } = bedIntegration;


  const getVisitTimestamp = useCallback((visit: PatientVisit) => {
    return new Date(visit.updated_at || visit.created_at || 0).getTime();
  }, []);

  const isLatestVisitForBed = useCallback((visitId: string, bedId: number) => {
    const latestVisit = visitsRef.current
      .filter(v => v.bed_id === bedId)
      .sort((a, b) => getVisitTimestamp(a) - getVisitTimestamp(b))
      .pop();

    return !!latestVisit && latestVisit.id === visitId;
  }, [visitsRef, getVisitTimestamp]);

  // Handler to sync bed status changes (Bed -> Log)
  const handleLogUpdate = useCallback((bedId: number, updates: Partial<PatientVisit>) => {
     const currentVisits = visitsRef.current;
     const bedVisits = currentVisits.filter(v => v.bed_id === bedId);
     
     // Sort by latest mutation time so we always patch the newest row for the bed.
     bedVisits.sort((a, b) => getVisitTimestamp(a) - getVisitTimestamp(b));

     if (bedVisits.length > 0) {
        const lastVisit = bedVisits[bedVisits.length - 1];
        updateLogVisit(lastVisit.id, updates);
     }
  }, [updateLogVisit, visitsRef, getVisitTimestamp]);

  // Cross-Domain Logic (Bed <-> Log Sync)
  const updateVisitWithBedSync = useCallback(async (id: string, updates: Partial<PatientVisit>, skipBedSync: boolean = false) => {
      const oldVisit = visitsRef.current.find(v => v.id === id);
      if (!oldVisit) return;

      let shouldForceRestart = false;

      // Conflict Check 1: Bed Assignment Change
      const targetBedId = updates.bed_id !== undefined ? updates.bed_id : oldVisit.bed_id;
      
      if (!skipBedSync && targetBedId) {
         // Case A: Moving/Assigning Bed
         const isBedAssignmentChange = updates.bed_id !== undefined && updates.bed_id !== oldVisit.bed_id;

         if (isBedAssignmentChange) {
             const targetBed = bedsRef.current.find(b => b.id === targetBedId);
             if (targetBed && targetBed.status === BedStatus.ACTIVE) {
                 // Confirm popup is handled at BedSelectorCell level (cursor popup)
                 // Do NOT call clearBed here — overrideBedFromLog with forceRestart=true
                 // will overwrite the bed state in a single setState call, avoiding
                 // React batching race conditions where clearBed's IDLE could overwrite
                 // the new ACTIVE state.
                 shouldForceRestart = true;
             }
         }
         
         // Case B: Updating Treatment on Same Bed
         if (updates.treatment_name !== undefined && updates.treatment_name !== oldVisit.treatment_name) {
             const targetBed = bedsRef.current.find(b => b.id === targetBedId);
             if (targetBed && targetBed.status === BedStatus.ACTIVE) {
                 shouldForceRestart = true;
             }
         }
      }

      await updateLogVisit(id, updates);

      if (skipBedSync) return;

      // Re-read latest visit after optimistic update so rapid sequential edits
      // (e.g. bed_id then treatment_name) don't lose freshly changed fields.
      const latestVisit = visitsRef.current.find(v => v.id === id);
      const mergedVisit = { ...oldVisit, ...(latestVisit || {}), ...updates };

      if (mergedVisit.bed_id && updates.memo !== undefined) {
          updateBedMemoFromLog(mergedVisit.bed_id, updates.memo || undefined);
      }

      if (oldVisit.bed_id && updates.bed_id === null) {
          // 최신 활성 행이 아닌 과거 행의 bed 해제 변경으로 현재 배드가 비워지는 것을 방지
          if (!isLatestVisitForBed(id, oldVisit.bed_id)) {
            return;
          }

          clearBed(oldVisit.bed_id);
          return;
      }

      if (mergedVisit.bed_id) {
          if (oldVisit.bed_id && updates.bed_id && oldVisit.bed_id !== updates.bed_id) {
             // 과거 행의 bed 이동 변경으로 현재 활성 배드가 비워지지 않도록 최신 행일 때만 clear
             if (isLatestVisitForBed(id, oldVisit.bed_id)) {
               clearBed(oldVisit.bed_id);
             }
             shouldForceRestart = true;
          }
          // NOTE:
          // treatment_name can be temporarily empty during rapid/partial row edits.
          // Never auto-clear an active bed in that transient state unless user explicitly clears bed_id.
          const hasTreatment = !!mergedVisit.treatment_name && mergedVisit.treatment_name.trim() !== '';
          if (!hasTreatment) {
             return;
          }

          overrideBedFromLog(mergedVisit.bed_id, mergedVisit, shouldForceRestart);
      }
  }, [updateLogVisit, clearBed, overrideBedFromLog, updateBedMemoFromLog, bedsRef, visitsRef, isLatestVisitForBed]);

  const movePatient = useCallback(async (fromBedId: number, toBedId: number) => {
    if (fromBedId === toBedId) return;

    // Confirm popup is handled at BedSelectorCell level (cursor popup)
    const targetBed = bedsRef.current.find(b => b.id === toBedId);

    const sourceBed = bedsRef.current.find(b => b.id === fromBedId);
    const isSourceActive = sourceBed && sourceBed.status === BedStatus.ACTIVE;

    const visitsForBed = visitsRef.current.filter(v => v.bed_id === fromBedId);
    visitsForBed.sort((a, b) => getVisitTimestamp(a) - getVisitTimestamp(b));
    const latestVisit = visitsForBed[visitsForBed.length - 1];

    if (isSourceActive) {
      await moveBedState(fromBedId, toBedId);
      if (latestVisit) {
        await updateLogVisit(latestVisit.id, { bed_id: toBedId }); 
      }
    } else if (latestVisit) {
      await updateLogVisit(latestVisit.id, { bed_id: toBedId });
      const updatedVisit = { ...latestVisit, bed_id: toBedId };
      clearBed(fromBedId);
      overrideBedFromLog(toBedId, updatedVisit, true);
    } else {
       alert(`${fromBedId}번 배드는 비어있어 이동할 데이터가 없습니다.`);
    }
  }, [moveBedState, updateLogVisit, clearBed, overrideBedFromLog, bedsRef, visitsRef, getVisitTimestamp]);

  return {
    handleLogUpdate,
    updateVisitWithBedSync,
    movePatient
  };
};
