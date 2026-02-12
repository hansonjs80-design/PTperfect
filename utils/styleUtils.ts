
import { BedState, BedStatus, TreatmentStep } from '../types';

// --- Helper: Convert Step BG Color to Text Color ---
// Moved to top to be accessible by getStepColor
export const mapBgToTextClass = (bgClass: string): string => {
  // Custom Hex Color handling: Convert bg-[#...] to text-[#...]
  if (bgClass.startsWith('bg-[#')) {
    return bgClass.replace('bg-', 'text-');
  }
  
  if (bgClass.includes('red')) return 'text-red-600 dark:text-red-400';
  if (bgClass.includes('blue')) return 'text-blue-600 dark:text-blue-400';
  if (bgClass.includes('green')) return 'text-emerald-600 dark:text-emerald-400';
  if (bgClass.includes('orange')) return 'text-orange-600 dark:text-orange-400';
  if (bgClass.includes('purple')) return 'text-purple-600 dark:text-purple-400';
  if (bgClass.includes('pink')) return 'text-pink-600 dark:text-pink-400';
  if (bgClass.includes('cyan')) return 'text-cyan-600 dark:text-cyan-400';
  if (bgClass.includes('yellow')) return 'text-yellow-600 dark:text-yellow-400';
  if (bgClass.includes('sky')) return 'text-sky-600 dark:text-sky-400';
  if (bgClass.includes('violet')) return 'text-violet-600 dark:text-violet-400';
  
  // Default fallback
  return 'text-slate-600 dark:text-slate-400';
};

// --- Bed Header Styles ---

export const getBedHeaderStyles = (bed: BedState): string => {
  const isBedT = bed.id === 11;

  // 1. 완료 상태 (최우선)
  if (bed.status === BedStatus.COMPLETED) {
    return 'bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700';
  }
  
  // 2. 배드 번호별 색상 적용 (방번호 색 + 흰색 70% 느낌 -> Tailwind 100 shade)
  
  // Group 1: Sky (1, 2)
  if (bed.id === 1 || bed.id === 2) {
      return 'bg-sky-100 dark:bg-sky-900/40 border-b border-sky-200 dark:border-sky-800';
  }

  // Group 2: Purple (3, 4, 5, 6)
  if (bed.id >= 3 && bed.id <= 6) {
      return 'bg-purple-100 dark:bg-purple-900/40 border-b border-purple-200 dark:border-purple-800';
  }

  // Group 3: Indigo (7, 8, 9, 10) & Traction (11)
  // 남색(Indigo) 계열 적용
  if ((bed.id >= 7 && bed.id <= 10) || isBedT) {
      return 'bg-indigo-100 dark:bg-indigo-900/40 border-b border-indigo-200 dark:border-indigo-800';
  }

  // Default fallback
  return 'bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700';
};

export const getBedNumberColor = (bed: BedState): string => {
  const isBedT = bed.id === 11;
  
  if (bed.status === BedStatus.COMPLETED) {
    return 'text-slate-400 dark:text-slate-500';
  }
  
  if (isBedT) {
    return 'text-indigo-700 dark:text-indigo-400';
  }

  // 그룹별 색상 포인트
  // 1, 2: 하늘색
  if (bed.id === 1 || bed.id === 2) return 'text-sky-600 dark:text-sky-400';
  
  // 3, 4, 5, 6: 보라색
  if (bed.id >= 3 && bed.id <= 6) return 'text-purple-600 dark:text-purple-400';
  
  // 7, 8, 9, 10: 남색 (Indigo)
  if (bed.id >= 7 && bed.id <= 10) return 'text-indigo-700 dark:text-indigo-400';

  return 'text-slate-700 dark:text-slate-200';
};

// --- Bed Step Styles ---

export const getStepColor = (
  step: TreatmentStep, 
  isActive: boolean, 
  isPast: boolean, 
  isInQueue: boolean, 
  isCompleted: boolean
): string => {
  if (isCompleted) {
    return 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500';
  }

  if (isPast) {
    return 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 opacity-60 grayscale';
  }
  
  if (isActive) {
    // 활성 상태는 기존의 강렬한 배경색 유지하되, 약간의 그라데이션 느낌이나 솔리드함 강조
    if (step.color.startsWith('bg-[#')) {
        return `${step.color} text-white shadow-inner`;
    }
    // Tailwind colors logic
    if (step.color.includes('red')) return 'bg-red-500 text-white';
    if (step.color.includes('blue')) return 'bg-blue-500 text-white';
    if (step.color.includes('purple')) return 'bg-purple-500 text-white';
    if (step.color.includes('orange')) return 'bg-orange-500 text-white';
    if (step.color.includes('green')) return 'bg-emerald-500 text-white';
    if (step.color.includes('pink')) return 'bg-pink-500 text-white';
    if (step.color.includes('cyan')) return 'bg-cyan-500 text-white';
    if (step.color.includes('sky')) return 'bg-sky-500 text-white';
    if (step.color.includes('yellow')) return 'bg-yellow-400 text-black'; 
    if (step.color.includes('violet')) return 'bg-violet-500 text-white';
    
    return 'bg-slate-700 text-white';
  }

  // 대기 중인 스텝 (Upcoming)
  // 기존에는 회색 텍스트였으나, 처방 색상에 맞는 텍스트 색상으로 변경
  const textColor = mapBgToTextClass(step.color);
  return `bg-white dark:bg-slate-800/80 ${textColor}`;
};

// --- Bed Card Container Styles ---

export const getBedCardStyles = (bed: BedState, isOvertime: boolean, isNearEnd: boolean): string => {
  // Mobile Portrait: h-auto to shrink wrap content
  // Desktop/Tablet/Landscape: sm:h-full to fill grid
  let base = "relative flex flex-col h-auto sm:h-full rounded-2xl overflow-hidden select-none transition-all duration-300 ";
  
  // Height Logic Updated:
  // Mobile Portrait: min-h-[112px] (Reduced by ~10% from 125px)
  // Tablet Portrait (sm): min-h-[150px] (Maintained)
  // Landscape: Preserved specific overrides
  const heightClasses = "min-h-[112px] sm:min-h-[150px] landscape:min-h-[200px] sm:landscape:min-h-[118px] lg:landscape:min-h-[200px] ";

  let statusClasses = "";
  
  if (bed.status === BedStatus.COMPLETED) {
     // 완료 상태
     statusClasses = "bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm opacity-90";
  } else if (isOvertime) {
     // 초과 상태 (빨강, 깜빡임 추가) - animate-pulse 추가
     statusClasses = "bg-white dark:bg-slate-800 ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] z-10 animate-pulse";
  } else if (isNearEnd) {
     // 1분 이하 남음 (주황, 깜빡임)
     statusClasses = "bg-white dark:bg-slate-800 ring-2 ring-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] z-10 animate-pulse";
  } else if (bed.status === BedStatus.ACTIVE) {
     // 활성 상태: 방 번호 색상에 맞춘 테두리 적용
     statusClasses = "bg-white dark:bg-slate-800 shadow-md ";
     
     if (bed.id === 1 || bed.id === 2) {
         // Sky Group
         statusClasses += "border-2 border-sky-300 dark:border-sky-700 ";
     } else if (bed.id >= 3 && bed.id <= 6) {
         // Purple Group
         statusClasses += "border-2 border-purple-300 dark:border-purple-700 ";
     } else if ((bed.id >= 7 && bed.id <= 10) || bed.id === 11) {
         // Indigo Group
         statusClasses += "border-2 border-indigo-300 dark:border-indigo-700 ";
     } else {
         // Default Fallback
         statusClasses += "border border-transparent dark:border-slate-700 ";
     }

     // 주사 알림은 링으로 유지 (테두리와 겹치지 않게 offset 사용)
     if (bed.isInjection) statusClasses += ' ring-2 ring-red-400/50 ring-offset-1 dark:ring-offset-slate-900';
  } else {
     // IDLE 상태
     statusClasses = "bg-white/50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 shadow-none hover:bg-white hover:border-solid hover:shadow-sm hover:border-brand-300 transition-all";
  }

  return base + heightClasses + statusClasses;
};
