
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
  color?: string; // set badge color in patient-log treatment cell
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
  isIon?: boolean; // Tracks if the patient needs Ion therapy
  isExercise?: boolean; // Tracks if the patient needs exercise therapy
  isInjectionCompleted?: boolean; // Tracks if the injection is completed
  patientMemo?: string; // Memo for the patient in this bed
  updatedAt?: string; // ISO String from DB, used for sync conflict resolution
  lastUpdateTimestamp?: number; // Local-only: timestamp of last user action to debounce server echoes
}

export interface PatientVisit {
  id: string;
  visit_date: string; // YYYY-MM-DD
  bed_id: number | null;
  patient_name: string;
  body_part: string;
  gender?: string;
  treatment_name: string;
  memo?: string; // Added memo field
  special_note?: string;
  author: string;
  created_at?: string;
  updated_at?: string;
  // Status Flags
  is_injection?: boolean;
  is_injection_completed?: boolean;
  is_fluid?: boolean;
  is_traction?: boolean;
  is_eswt?: boolean;
  is_manual?: boolean;
  is_ion?: boolean;
  is_exercise?: boolean;
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
  isInjectionCompleted?: boolean;
  isFluid?: boolean;
  isTraction?: boolean;
  isESWT?: boolean;
  isManual?: boolean;
  isIon?: boolean;
  isExercise?: boolean;
}
