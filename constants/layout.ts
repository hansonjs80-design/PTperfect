
export const LANDSCAPE_GRID_IDS = [1, 2, null, 11, 3, 4, 5, 6, 10, 9, 8, 7];

// Requested Layout:
// Row 1 (Top): T(11), Empty, 2, 1
// Row 2 (Mid): 6, 5, 4, 3
// Row 3 (Bot): 7, 8, 9, 10
export const LANDSCAPE_GRID_IDS_ALT = [11, null, 2, 1, 6, 5, 4, 3, 7, 8, 9, 10];

export interface BedPairConfig {
  left: number | null;
  right: number | null;
}

// 1-11, 2-Reserved, 3-10, 4-9... 대칭형 배치 구조 (Default)
export const PORTRAIT_PAIRS_CONFIG: BedPairConfig[] = [
  { left: 1, right: 11 },
  { left: 2, right: null },
  { left: 3, right: 10 },
  { left: 4, right: 9 },
  { left: 5, right: 8 },
  { left: 6, right: 7 },
];

// 세로 모드 대체 배치 (Alt)
// 좌측 열: 7, 8, 9, 10, 빈칸, T(11)
// 우측 열: 6, 5, 4, 3, 2, 1
export const PORTRAIT_PAIRS_CONFIG_ALT: BedPairConfig[] = [
  { left: 7, right: 6 },
  { left: 8, right: 5 },
  { left: 9, right: 4 },
  { left: 10, right: 3 },
  { left: null, right: 2 },
  { left: 11, right: 1 },
];

// 반응형 그리드 클래스 유틸리티
export const GRID_RESPONSIVE_CLASSES = "grid gap-2 sm:gap-4 md:gap-5 lg:gap-6 w-full h-full content-start";
export const GRID_COLS_CLASSES = "grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
