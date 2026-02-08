
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
  if (row.memos !== undefined) result.memos = row.memos || {};
  if (row.updated_at !== undefined) result.updatedAt = row.updated_at;

  return result;
};

// Partial BedState -> Partial DB Row
export const mapBedToDbPayload = (updates: Partial<BedState>): any => {
  const payload: any = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.currentPresetId !== undefined) payload.current_preset_id = updates.currentPresetId;
  if (updates.currentStepIndex !== undefined) payload.current_step_index = updates.currentStepIndex;
  if (updates.queue !== undefined) payload.queue = updates.queue;
  if (updates.startTime !== undefined) payload.start_time = updates.startTime;
  if (updates.isPaused !== undefined) payload.is_paused = updates.isPaused;
  if (updates.isInjection !== undefined) payload.is_injection = updates.isInjection;
  if (updates.isFluid !== undefined) payload.is_fluid = updates.isFluid;
  if (updates.isTraction !== undefined) payload.is_traction = updates.isTraction;
  if (updates.isESWT !== undefined) payload.is_eswt = updates.isESWT;
  if (updates.isManual !== undefined) payload.is_manual = updates.isManual;
  if (updates.memos !== undefined) payload.memos = updates.memos;
  if (updates.customPreset !== undefined) payload.custom_preset_json = updates.customPreset;
  if (updates.originalDuration !== undefined) payload.original_duration = updates.originalDuration;

  payload.updated_at = new Date().toISOString();
  return payload;
};

export const shouldIgnoreServerUpdate = (localBed: BedState, serverBed: Partial<BedState>): boolean => {
  if (!localBed.lastUpdateTimestamp) return false;
  const serverUpdateTime = serverBed.updatedAt ? new Date(serverBed.updatedAt).getTime() : 0;
  return localBed.lastUpdateTimestamp > serverUpdateTime;
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
