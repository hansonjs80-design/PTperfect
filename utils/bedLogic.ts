
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

export const shouldIgnoreServerUpdate = (localBed: BedState, serverBed: Partial<BedState>): boolean => {
  // IDLE 전환(다른 기기에서 비우기)은 절대 무시하지 않음
  if (serverBed.status === BedStatus.IDLE && localBed.status !== BedStatus.IDLE) return false;
  if (!localBed.lastUpdateTimestamp) return false;

  // 로컬에서 10초 이내에 변경한 bed는 서버 데이터로 덮어쓰지 않음
  // → 폴링(5초)이 로컬 상태를 덮어쓰는 깜빡임 방지
  const LOCAL_PROTECT_WINDOW_MS = 10000;
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
