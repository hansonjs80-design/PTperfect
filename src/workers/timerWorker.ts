// Web Worker for handling precise timing off the main thread
/* eslint-disable no-restricted-globals */

interface TimerMessage {
  type: 'UPDATE_BEDS';
  beds: Array<{
    id: number;
    startTime: number | null;
    duration: number; // seconds
    isEnabled: boolean;
    presetId: string | null;
  }>;
}

interface WorkerState {
  beds: Map<number, { targetTime: number; alerted: boolean }>;
}

const state: WorkerState = {
  beds: new Map(),
};

self.onmessage = (e: MessageEvent<TimerMessage>) => {
  if (e.data.type === 'UPDATE_BEDS') {
    const currentIds = new Set<number>();

    e.data.beds.forEach((bed) => {
      if (bed.isEnabled && bed.startTime) {
        currentIds.add(bed.id);
        const targetTime = bed.startTime + (bed.duration * 1000);
        
        // 새로운 배드거나, 기존 정보가 없으면 추가
        if (!state.beds.has(bed.id) || state.beds.get(bed.id)?.targetTime !== targetTime) {
          state.beds.set(bed.id, { 
            targetTime, 
            alerted: false 
          });
        }
      }
    });

    // 제거된 배드 정리
    for (const id of state.beds.keys()) {
      if (!currentIds.has(id)) {
        state.beds.delete(id);
      }
    }
  }
};

// 1초마다 메인 스레드로 'TICK' 메시지 전송 및 알람 체크
setInterval(() => {
  const now = Date.now();
  
  state.beds.forEach((info, id) => {
    const remainingMs = info.targetTime - now;
    
    // 알람 조건: 시간이 다 되었고(0 이하), 아직 알림을 보내지 않았을 때
    // 오차 범위를 고려하여 -1초 ~ 1초 사이를 0으로 처리하되, 
    // 여기서는 정확히 0 이하로 떨어지는 순간을 포착
    if (remainingMs <= 0 && !info.alerted) {
      info.alerted = true; // 알림 발송 처리
      self.postMessage({ type: 'ALARM', bedId: id });
    }
  });

  // UI 업데이트용 틱 (매초 전송)
  self.postMessage({ type: 'TICK' });

}, 1000);

export {};
