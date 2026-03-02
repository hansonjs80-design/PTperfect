
import { BedState, BedStatus, Preset } from '../types';

// DB Row -> Partial BedState
export const mapRowToBed = (row: any): Partial<BedState> => {
  const MAX_AGE_MS = 12 * 60 * 60 * 1000;
  let status = row.status as BedStatus | undefined;
  let startTime = row.start_time;

  if (status === BedStatus.ACTIVE && startTime && (Date.now() - startTime > MAX_AGE_MS)) {
    status = BedStatus.IDLE;
    startTime = null;
  }

  // ★ IDLE 상태인데 preset 등 stale 데이터가 남아있으면 강제 정리
  // → DB에서 clearBedInDb의 upsert가 아직 반영되지 않은 중간 상태 방지
  if (status === BedStatus.IDLE) {
    return {
      id: row.id,
      status: BedStatus.IDLE,
      currentPresetId: null,
      customPreset: undefined,
      currentStepIndex: 0,
      queue: [],
      startTime: null,
      isPaused: false,
      remainingTime: 0,
      originalDuration: undefined,
      isInjection: false,
      isFluid: false,
      isTraction: false,
      isESWT: false,
      isManual: false,
      isInjectionCompleted: false,
      patientMemo: undefined,
      updatedAt: row.updated_at,
    };
  }

  const result: any = { id: row.id };
  if (status !== undefined) result.status = status;
  if (row.current_preset_id !== undefined) result.currentPresetId = row.current_preset_id;
  if (row.custom_preset_json !== undefined) result.customPreset = row.custom_preset_json;
  if (row.current_step_index !== undefined) result.currentStepIndex = row.current_step_index;
  if (row.queue !== undefined) result.queue = row.queue || [];
  if (startTime !== undefined) result.startTime = startTime;
  if (row.is_paused !== undefined) result.isPaused = row.is_paused;
  if (row.original_duration !== undefined) result.originalDuration = row.original_duration;
  if (row.is_injection !== undefined) result.isInjection = !!row.is_injection;
  if (row.is_fluid !== undefined) result.isFluid = !!row.is_fluid;
  if (row.is_traction !== undefined) result.isTraction = !!row.is_traction;
  if (row.is_eswt !== undefined) result.isESWT = !!row.is_eswt;
  if (row.is_manual !== undefined) result.isManual = !!row.is_manual;
  if (row.is_injection_completed !== undefined) result.isInjectionCompleted = !!row.is_injection_completed;
  if (row.patient_memo !== undefined) result.patientMemo = row.patient_memo || undefined;
  if (row.updated_at !== undefined) result.updatedAt = row.updated_at;

  return result;
};

// Partial BedState -> Partial DB Row
export const mapBedToDbPayload = (updates: Partial<BedState>): any => {
  const payload: any = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if ('currentPresetId' in updates) payload.current_preset_id = updates.currentPresetId ?? null;
  if (updates.currentStepIndex !== undefined) payload.current_step_index = updates.currentStepIndex;
  if ('queue' in updates) payload.queue = updates.queue ?? [];
  if ('startTime' in updates) payload.start_time = updates.startTime ?? null;
  if (updates.isPaused !== undefined) payload.is_paused = updates.isPaused;
  if (updates.isInjection !== undefined) payload.is_injection = updates.isInjection;
  if (updates.isFluid !== undefined) payload.is_fluid = updates.isFluid;
  if (updates.isTraction !== undefined) payload.is_traction = updates.isTraction;
  if (updates.isESWT !== undefined) payload.is_eswt = updates.isESWT;
  if (updates.isManual !== undefined) payload.is_manual = updates.isManual;
  if (updates.isInjectionCompleted !== undefined) payload.is_injection_completed = updates.isInjectionCompleted;
  // null도 명시적으로 저장해야 하므로 hasOwnProperty 체크 사용
  if ('patientMemo' in updates) payload.patient_memo = updates.patientMemo ?? null;
  if ('customPreset' in updates) payload.custom_preset_json = updates.customPreset ?? null;
  if ('originalDuration' in updates) payload.original_duration = updates.originalDuration ?? null;

  payload.updated_at = new Date().toISOString();
  return payload;
};


const toEpochMsForSync = (iso?: string): number => {
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const shouldIgnoreServerUpdate = (localBed: BedState, serverBed: Partial<BedState>): boolean => {
  // 메모 변경은 디바이스 간 즉시 동기화가 중요하므로 로컬 보호 예외 처리
  if ('patientMemo' in serverBed && serverBed.patientMemo !== localBed.patientMemo) return false;

  // 상태 변경(특히 처방 시작/종료)은 즉시 반영
  if (serverBed.status !== undefined && serverBed.status !== localBed.status) return false;

  // 처방/진행 정보 변경은 서버가 더 최신일 때만 즉시 반영.
  // 로컬 직후 stale 서버 이벤트가 되돌리는 "왔다 갔다" 현상 방지.
  const hasPrescriptionChange =
    (serverBed.currentPresetId !== undefined && serverBed.currentPresetId !== localBed.currentPresetId) ||
    (serverBed.customPreset !== undefined && JSON.stringify(serverBed.customPreset) !== JSON.stringify(localBed.customPreset)) ||
    (serverBed.currentStepIndex !== undefined && serverBed.currentStepIndex !== localBed.currentStepIndex) ||
    (serverBed.startTime !== undefined && serverBed.startTime !== localBed.startTime) ||
    (serverBed.queue !== undefined && JSON.stringify(serverBed.queue) !== JSON.stringify(localBed.queue));

  if (hasPrescriptionChange) {
    // 로컬에서 방금(특히 스텝 좌/우 이동 직후) 발생한 변경은 잠시 강하게 보호해서
    // stale 서버 이벤트로 인한 처방 텍스트 "튀는" 현상을 막는다.
    const LOCAL_PRESCRIPTION_STABILIZE_MS = 1500;
    if (localBed.lastUpdateTimestamp) {
      const localAge = Date.now() - localBed.lastUpdateTimestamp;
      if (localAge < LOCAL_PRESCRIPTION_STABILIZE_MS) return true;
    }

    const serverUpdatedAtMs = toEpochMsForSync(serverBed.updatedAt);
    if (localBed.lastUpdateTimestamp && serverUpdatedAtMs > 0 && serverUpdatedAtMs <= localBed.lastUpdateTimestamp) {
      return true;
    }
    return false;
  }

  // IDLE 전환(다른 기기에서 비우기)은 절대 무시하지 않음
  if (serverBed.status === BedStatus.IDLE && localBed.status !== BedStatus.IDLE) return false;
  if (!localBed.lastUpdateTimestamp) return false;

  // 로컬에서 30초 이내에 변경한 bed는 서버 데이터로 덮어쓰지 않음
  // → 폴링(5초)이 로컬 상태를 덮어쓰는 깜빡임 방지 (일괄 비우기 시 DB 지연 대응)
  const LOCAL_PROTECT_WINDOW_MS = 30000;
  const localAge = Date.now() - localBed.lastUpdateTimestamp;
  return localAge < LOCAL_PROTECT_WINDOW_MS;
};

export const calculateRemainingTime = (bed: BedState, presets: Preset[]): number => {
  if (bed.status !== BedStatus.ACTIVE || !bed.startTime || bed.isPaused) return bed.remainingTime;
  const preset = bed.customPreset || presets.find(p => p.id === bed.currentPresetId);
  const step = preset?.steps[bed.currentStepIndex];
  if (step?.enableTimer) {
    const duration = bed.originalDuration || step.duration;
    const elapsed = Math.floor((Date.now() - bed.startTime) / 1000);
    return duration - elapsed;
  }
  return 0;
};

/** IDLE 전환 시 bed를 완전 초기화하는 유틸리티 */
export const forceIdleBed = (bed: Partial<BedState>): BedState => ({
  ...bed,
  status: BedStatus.IDLE,
  remainingTime: 0,
  customPreset: undefined,
  currentPresetId: null,
  currentStepIndex: 0,
  queue: [],
  startTime: null,
  isPaused: false,
  isInjection: false,
  isFluid: false,
  isTraction: false,
  isESWT: false,
  isManual: false,
  isInjectionCompleted: false,
  patientMemo: undefined,
  originalDuration: undefined,
  lastUpdateTimestamp: Date.now(), // 폴링으로부터 10초간 보호
} as BedState);
