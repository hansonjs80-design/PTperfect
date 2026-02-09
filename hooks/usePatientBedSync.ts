
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
  const { overrideBedFromLog, moveBedState } = bedIntegration;

  // Handler to sync bed status changes (Bed -> Log)
  const handleLogUpdate = useCallback((bedId: number, updates: Partial<PatientVisit>) => {
     const currentVisits = visitsRef.current;
     const bedVisits = currentVisits.filter(v => v.bed_id === bedId);
     
     // Sort by created_at to guarantee we pick the latest session
     bedVisits.sort((a, b) => (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()));

     if (bedVisits.length > 0) {
        const lastVisit = bedVisits[bedVisits.length - 1];
        updateLogVisit(lastVisit.id, updates);
     }
  }, [updateLogVisit, visitsRef]);

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
                 if (!window.confirm(`${targetBedId}번 배드는 비어있지 않습니다.\n배드카드를 비우고 입력할까요?`)) {
                     return;
                 }
                 shouldForceRestart = true;
             }
         }
         
         // Case B: Updating Treatment on Same Bed
         if (updates.treatment_name !== undefined && updates.treatment_name !== oldVisit.treatment_name) {
             const targetBed = bedsRef.current.find(b => b.id === targetBedId);
             if (targetBed && targetBed.status === BedStatus.ACTIVE) {
                 if (!window.confirm(`${targetBedId}번 배드는 비어있지 않습니다.\n배드카드를 비우고 입력할까요?`)) {
                     return;
                 }
                 shouldForceRestart = true;
             }
         }
      }

      await updateLogVisit(id, updates);

      if (skipBedSync) return;

      const mergedVisit = { ...oldVisit, ...updates };

      if (oldVisit.bed_id && updates.bed_id === null) {
          clearBed(oldVisit.bed_id); 
          return;
      }

      if (mergedVisit.bed_id) {
          if (oldVisit.bed_id && updates.bed_id && oldVisit.bed_id !== updates.bed_id) {
             clearBed(oldVisit.bed_id);
             shouldForceRestart = true;
          }
          overrideBedFromLog(mergedVisit.bed_id, mergedVisit, shouldForceRestart);
      }
  }, [updateLogVisit, clearBed, overrideBedFromLog, bedsRef, visitsRef]);

  const movePatient = useCallback(async (fromBedId: number, toBedId: number) => {
    if (fromBedId === toBedId) return;

    const targetBed = bedsRef.current.find(b => b.id === toBedId);
    if (targetBed && targetBed.status === BedStatus.ACTIVE) {
        if (!window.confirm(`${toBedId}번 배드는 현재 활성화 되어있습니다. 그래도 진행하시겠습니까?\n(기존 내용을 비우고 해당 항목으로 변경됩니다)`)) {
            return;
        }
    }

    const sourceBed = bedsRef.current.find(b => b.id === fromBedId);
    const isSourceActive = sourceBed && sourceBed.status === BedStatus.ACTIVE;

    const visitsForBed = visitsRef.current.filter(v => v.bed_id === fromBedId);
    visitsForBed.sort((a, b) => (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()));
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
  }, [moveBedState, updateLogVisit, clearBed, overrideBedFromLog, bedsRef, visitsRef]);

  return {
    handleLogUpdate,
    updateVisitWithBedSync,
    movePatient
  };
};
