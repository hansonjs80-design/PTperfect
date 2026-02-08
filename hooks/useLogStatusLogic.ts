
import { useMemo, useCallback } from 'react';
import { BedState, BedStatus, PatientVisit } from '../types';

export const useLogStatusLogic = (beds: BedState[], visits: PatientVisit[]) => {
  
  // 1. 배드 상태 매핑 (타이머 변경 무시, 상태 변경시에만 갱신)
  // beds 배열 전체가 아니라 id와 status만 추출하여 의존성 키로 사용
  const bedsStatusKey = JSON.stringify(beds.map(b => ({ id: b.id, s: b.status })));
  
  const bedStatusMap = useMemo(() => {
    const map = new Map<number, BedStatus>();
    beds.forEach(b => map.set(b.id, b.status));
    return map;
  }, [bedsStatusKey]);

  // 2. 각 배드별 최신 방문 기록 ID 매핑
  // visits 배열이 변경될 때만 갱신
  const latestVisitMap = useMemo(() => {
    const map = new Map<number, string>(); // BedId -> VisitId
    
    // 배드별로 그룹화
    const visitsByBed: Record<number, PatientVisit[]> = {};
    visits.forEach(v => {
      if (v.bed_id) {
        if (!visitsByBed[v.bed_id]) visitsByBed[v.bed_id] = [];
        visitsByBed[v.bed_id].push(v);
      }
    });

    // 각 배드별 최신 레코드 찾기
    Object.entries(visitsByBed).forEach(([bedIdStr, bedVisits]) => {
      const bedId = parseInt(bedIdStr);
      // created_at 기준 정렬 (문자열 비교도 ISO 형식이면 작동하지만, 안전하게 시간비교)
      bedVisits.sort((a, b) => (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()));
      const latest = bedVisits[bedVisits.length - 1];
      if (latest) {
        map.set(bedId, latest.id);
      }
    });

    return map;
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
