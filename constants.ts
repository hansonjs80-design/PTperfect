import { Preset, TreatmentStep, QuickTreatment } from './types';

export const TOTAL_BEDS = 11;

const createStep = (name: string, minutes: number, enableTimer: boolean, color: string): TreatmentStep => ({
  id: crypto.randomUUID(),
  name,
  duration: minutes * 60,
  enableTimer,
  color,
});

// This is now the "Initial Seed" for QuickTreatments
export const STANDARD_TREATMENTS: QuickTreatment[] = [
  { id: 'qt-1', name: '핫팩 (Hot Pack)', label: 'HP', duration: 10, color: 'bg-red-500', enableTimer: true },
  { id: 'qt-2', name: 'ICT', label: 'ICT', duration: 10, color: 'bg-blue-500', enableTimer: true },
  { id: 'qt-3', name: 'TENS', label: 'TENS', duration: 10, color: 'bg-green-500', enableTimer: true },
  { id: 'qt-4', name: 'Laser', label: 'Laser', duration: 5, color: 'bg-pink-500', enableTimer: true },
  { id: 'qt-5', name: '자기장 (Magnetic)', label: 'Mg', duration: 10, color: 'bg-purple-500', enableTimer: true },
  { id: 'qt-6', name: '적외선 (IR)', label: 'IR', duration: 10, color: 'bg-red-500', enableTimer: true },
  { id: 'qt-7', name: '견인 (Traction)', label: '견인', duration: 15, color: 'bg-orange-500', enableTimer: true },
  { id: 'qt-8', name: '충격파 (ESWT)', label: 'ES', duration: 10, color: 'bg-blue-500', enableTimer: true },
  { id: 'qt-9', name: '이온치료 (ION)', label: 'ION', duration: 10, color: 'bg-cyan-500', enableTimer: true },
  { id: 'qt-10', name: '공기압 (Air)', label: 'Air', duration: 15, color: 'bg-gray-500', enableTimer: true },
  { id: 'qt-11', name: '냉치료 (Cryo)', label: 'Cryo', duration: 5, color: 'bg-sky-500', enableTimer: true },
  { id: 'qt-12', name: '파라핀 (Paraffin)', label: 'Para', duration: 10, color: 'bg-yellow-500', enableTimer: false },
  { id: 'qt-13', name: '초음파 (Ultra)', label: 'US', duration: 5, color: 'bg-gray-500', enableTimer: true },
  { id: 'qt-14', name: '운동치료 (Exercise)', label: 'Ex', duration: 10, color: 'bg-green-500', enableTimer: true },
  { id: 'qt-15', name: '도수치료 (Manual)', label: '도수', duration: 10, color: 'bg-violet-500', enableTimer: true },
];

export const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'basic-mix',
    name: '기본 물리치료',
    steps: [
      createStep('핫팩 (Hot Pack)', 10, true, 'bg-red-500'),
      createStep('ICT', 10, true, 'bg-blue-500'),
      createStep('Laser', 5, true, 'bg-pink-500'),
    ],
  },
  {
    id: 'shoulder',
    name: '어깨 루틴',
    steps: [
      createStep('핫팩 (Hot Pack)', 10, true, 'bg-red-500'),
      createStep('TENS', 10, true, 'bg-green-500'),
      createStep('자기장 (Magnetic)', 10, true, 'bg-purple-500'),
    ],
  },
  {
    id: 'knee',
    name: '무릎 루틴',
    steps: [
      createStep('핫팩 (Hot Pack)', 10, true, 'bg-red-500'),
      createStep('ICT', 10, true, 'bg-blue-500'),
      createStep('초음파 (Ultra)', 5, true, 'bg-gray-500'),
    ],
  },
  {
    id: 'back',
    name: '허리 루틴',
    steps: [
      createStep('핫팩 (Hot Pack)', 10, true, 'bg-red-500'),
      createStep('ICT', 10, true, 'bg-blue-500'),
      createStep('자기장 (Magnetic)', 10, true, 'bg-purple-500'),
    ],
  }
];