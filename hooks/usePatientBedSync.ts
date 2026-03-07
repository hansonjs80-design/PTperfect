import React, { useCallback } from 'react';
import { BedState, BedStatus, PatientVisit } from '../types';
import { useBedIntegration } from './useBedIntegration';

export const usePatientBedSync = (
  bedsRef: React.MutableRefObject<BedState[]>,
  visitsRef: React.MutableRefObject<PatientVisit[]>,
  currentDate: string,
  updateLogVisit: (id: string, updates: Partial<PatientVisit>) => Promise<void>,
  clearBed: (id: number) => void,
  bedIntegration: ReturnType<typeof useBedIntegration>
) => {
  const { overrideBedFromLog, moveBedState, updateBedMemoFromLog } = bedIntegration;

  const getLocalISODate = useCallback(() => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
  }, []);

  const isTodayMode = useCallback(() => currentDate === getLocalISODate(), [currentDate, getLocalISODate]);

  const getVisitTimestamp = useCallback((visit: PatientVisit) => {
    return new Date(visit.updated_at || visit.created_at || 0).getTime();
  }, []);

  const getLatestVisitForBed = useCallback((bedId: number) => {
    let latest: PatientVisit | null = null;
    for (const visit of visitsRef.current) {
      if (visit.bed_id !== bedId) continue;
      if (!latest || getVisitTimestamp(visit) >= getVisitTimestamp(latest)) {
        latest = visit;
      }
    }
    return latest;
  }, [visitsRef, getVisitTimestamp]);

  const isLatestVisitForBed = useCallback((visitId: string, bedId: number) => {
    const latestVisit = getLatestVisitForBed(bedId);
    return !!latestVisit && latestVisit.id === visitId;
  }, [getLatestVisitForBed]);

  const hasMeaningfulUpdates = useCallback((currentVisit: PatientVisit, updates: Partial<PatientVisit>) => {
    const keys = Object.keys(updates) as (keyof PatientVisit)[];
    if (keys.length === 0) return false;
    return keys.some((key) => currentVisit[key] !== updates[key]);
  }, []);

  // Handler to sync bed status changes (Bed -> Log)
  const handleLogUpdate = useCallback((bedId: number, updates: Partial<PatientVisit>) => {
    if (!isTodayMode()) return;
    const latestVisit = getLatestVisitForBed(bedId);
    if (!latestVisit) return;
    if (!hasMeaningfulUpdates(latestVisit, updates)) return;

    void updateLogVisit(latestVisit.id, updates);
  }, [updateLogVisit, getLatestVisitForBed, hasMeaningfulUpdates, isTodayMode]);

  // Cross-Domain Logic (Bed <-> Log Sync)
  const updateVisitWithBedSync = useCallback(async (id: string, updates: Partial<PatientVisit>, skipBedSync: boolean = false) => {
    const oldVisit = visitsRef.current.find(v => v.id === id);
    if (!oldVisit) return;
    if (!isTodayMode()) return;
    if (oldVisit.visit_date && oldVisit.visit_date !== currentDate) return;
    if (!hasMeaningfulUpdates(oldVisit, updates)) return;

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

    }

    await updateLogVisit(id, updates);

    if (skipBedSync) return;

    // Re-read latest visit after optimistic update so rapid sequential edits
    // (e.g. bed_id then treatment_name) don't lose freshly changed fields.
    const latestVisit = visitsRef.current.find(v => v.id === id);
    const mergedVisit = { ...oldVisit, ...(latestVisit || {}), ...updates };
    if (mergedVisit.visit_date && mergedVisit.visit_date !== currentDate) return;

    if (mergedVisit.bed_id && updates.memo !== undefined) {
      updateBedMemoFromLog(mergedVisit.bed_id, updates.memo || undefined);
    }

    const shouldApplyBedRuntimeSync = updates.bed_id !== undefined;
    // 이름/부위/처방/메모/상태/작성 등 로그 편집은 배드 활성화/타이머 로직에 영향 주지 않음.
    if (!shouldApplyBedRuntimeSync) {
      return;
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
      // 과거 행/비최신 행이 현재 배드를 덮어쓰지 않도록 최신 행만 bed override 허용
      if (!isLatestVisitForBed(id, mergedVisit.bed_id)) {
        return;
      }

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
  }, [updateLogVisit, clearBed, overrideBedFromLog, updateBedMemoFromLog, bedsRef, visitsRef, isLatestVisitForBed, hasMeaningfulUpdates, isTodayMode, currentDate]);


  const activateVisitFromLog = useCallback((visitId: string, forceRestart: boolean = false) => {
    if (!isTodayMode()) return { ok: false, reason: 'not_today' as const };

    const visit = visitsRef.current.find(v => v.id === visitId);
    if (!visit) return { ok: false, reason: 'not_found' as const };
    if (!visit.bed_id) return { ok: false, reason: 'no_bed' as const };

    const hasTreatment = !!visit.treatment_name && visit.treatment_name.trim() !== '';
    if (!hasTreatment) return { ok: false, reason: 'no_treatment' as const };

    const latestVisit = getLatestVisitForBed(visit.bed_id);
    if (!latestVisit || latestVisit.id !== visitId) {
      return { ok: false, reason: 'not_latest' as const };
    }

    overrideBedFromLog(visit.bed_id, visit, forceRestart);
    return { ok: true as const };
  }, [isTodayMode, visitsRef, getLatestVisitForBed, overrideBedFromLog]);

  const movePatient = useCallback(async (fromBedId: number, toBedId: number) => {
    if (!isTodayMode()) return;
    if (fromBedId === toBedId) return;

    const sourceBed = bedsRef.current.find(b => b.id === fromBedId);
    const isSourceActive = sourceBed && sourceBed.status === BedStatus.ACTIVE;

    const latestVisit = getLatestVisitForBed(fromBedId);

    if (isSourceActive) {
      // IMPORTANT: update log bed_id first so "latest visit per bed" mapping is already
      // consistent when the active card is moved. Otherwise the stale-guard effect can
      // briefly see an ACTIVE target bed without a matching latest log row and clear it.
      if (latestVisit) {
        await updateLogVisit(latestVisit.id, { bed_id: toBedId });
      }

      await moveBedState(fromBedId, toBedId, sourceBed);
    } else if (latestVisit) {
      await updateLogVisit(latestVisit.id, { bed_id: toBedId });
      const updatedVisit = { ...latestVisit, bed_id: toBedId };
      clearBed(fromBedId);
      overrideBedFromLog(toBedId, updatedVisit, true);
    } else {
      alert(`${fromBedId}번 배드는 비어있어 이동할 데이터가 없습니다.`);
    }
  }, [moveBedState, updateLogVisit, clearBed, overrideBedFromLog, bedsRef, getLatestVisitForBed, isTodayMode]);

  return {
    handleLogUpdate,
    updateVisitWithBedSync,
    activateVisitFromLog,
    movePatient
  };
};
