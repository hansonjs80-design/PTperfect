import { useMemo, useCallback } from 'react';
import { BedState, BedStatus, PatientVisit } from '../types';

const getVisitTimestamp = (visit: PatientVisit) => {
  return new Date(visit.created_at || 0).getTime();
};

export const useLogStatusLogic = (beds: BedState[], visits: PatientVisit[]) => {
  // 1. 배드 상태 매핑 (타이머 변경 무시, 상태 변경시에만 갱신)
  // beds 배열 전체가 아니라 id와 status만 추출하여 의존성 키로 사용
  const bedsStatusKey = JSON.stringify(beds.map(b => ({ id: b.id, s: b.status })));

  const bedStatusMap = useMemo(() => {
    const map = new Map<number, BedStatus>();
    beds.forEach(b => map.set(b.id, b.status));
    return map;
  }, [bedsStatusKey]);

  // 2. 각 배드별 최신 방문 기록 ID 매핑 (single-pass)
  const latestVisitMap = useMemo(() => {
    const latestByBed = new Map<number, PatientVisit>();

    for (const visit of visits) {
      if (!visit.bed_id) continue;

      const prev = latestByBed.get(visit.bed_id);
      if (!prev || getVisitTimestamp(visit) >= getVisitTimestamp(prev)) {
        latestByBed.set(visit.bed_id, visit);
      }
    }

    const idMap = new Map<number, string>();
    latestByBed.forEach((visit, bedId) => idMap.set(bedId, visit.id));
    return idMap;
  }, [visits]);

  // 3. 상태 조회 함수 (메모이제이션 된 맵을 사용하여 O(1) 조회)
  const getRowStatus = useCallback((visitId: string, bedId: number | null): 'active' | 'completed' | 'none' => {
    if (!bedId) return 'none';

    const currentStatus = bedStatusMap.get(bedId);
    if (!currentStatus || currentStatus === BedStatus.IDLE) return 'none';

    // 해당 배드의 가장 최신 로그인지 확인
    const latestVisitId = latestVisitMap.get(bedId);
    if (latestVisitId !== visitId) return 'none';

    return currentStatus === BedStatus.COMPLETED ? 'completed' : 'active';
  }, [bedStatusMap, latestVisitMap]);

  return { getRowStatus };
};
