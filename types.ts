
export enum BedStatus {
  IDLE = 'IDLE',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export interface TreatmentStep {
  id: string;
  name: string; // e.g., "Hot Pack", "ICT", "Magnetic"
  label?: string; // Custom display text (e.g. "HP", "ICT")
  duration: number; // in seconds
  enableTimer: boolean; // Only true for Hot Pack based on requirements
  color: string; // visual cue for the step
}

export interface QuickTreatment {
  id: string;
  name: string; // Full name (e.g. "핫팩 (Hot Pack)")
  label: string; // Button label (e.g. "HP")
  duration: number; // in minutes (for consistency with editor UI)
  enableTimer: boolean;
  color: string;
  rank?: number;
}

export interface Preset {
  id: string;
  name: string; // e.g., "Basic"
  steps: TreatmentStep[];
}

export interface BedState {
  id: number;
  status: BedStatus;
  currentPresetId: string | null;
  customPreset?: Preset; // For one-off treatments like Traction with variable timer
  currentStepIndex: number;
  queue: number[]; // Array of step indices representing the execution order
  remainingTime: number; // in seconds
  startTime: number | null; // Timestamp
  originalDuration?: number; // Total duration of the current step (for sync)
  isPaused: boolean;
  isInjection: boolean; // Tracks if the patient is an injection patient
  isFluid: boolean; // Tracks if the patient has Fluids (IV)
  isTraction: boolean; // Tracks if the patient needs traction
  isESWT: boolean; // Tracks if the patient needs Shockwave (ESWT)
  isManual: boolean; // Tracks if the patient needs Manual Therapy (Do-su)
  memos: Record<number, string>; // Map of step index to memo string
  updatedAt?: string; // ISO String from DB, used for sync conflict resolution
  lastUpdateTimestamp?: number; // Local-only: timestamp of last user action to debounce server echoes
}

export interface PatientVisit {
  id: string;
  visit_date: string; // YYYY-MM-DD
  bed_id: number | null;
  patient_name: string;
  body_part: string;
  treatment_name: string;
  memo?: string; // Added memo field
  author: string;
  created_at?: string;
  // Status Flags
  is_injection?: boolean;
  is_fluid?: boolean;
  is_traction?: boolean;
  is_eswt?: boolean;
  is_manual?: boolean;
}

export interface AppState {
  beds: BedState[];
  presets: Preset[];
  isMenuOpen: boolean;
  isDarkMode: boolean;
}

// Layout Props Interface reduced to only what's needed for rendering structure
export interface BedLayoutProps {
  beds: BedState[];
  presets: Preset[];
}

export interface SelectPresetOptions {
  isInjection?: boolean;
  isFluid?: boolean;
  isTraction?: boolean;
  isESWT?: boolean;
  isManual?: boolean;
}
