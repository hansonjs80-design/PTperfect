
import { useState, useRef, useCallback, useEffect } from 'react';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

const MIN_COL_WIDTH = 24;
const MIN_COL_WIDTH_BY_INDEX: Record<number, number> = {
  9: 82, // 타이머
  6: 70, // 상태
  10: 30, // 작성
};
const MAX_COL_WIDTH_BY_INDEX: Record<number, number> = {};
export const FLEX_COL_INDEX = -1; // 강제 채움 비활성화: 컬럼 리사이즈는 실제 너비를 유지
const STORAGE_KEY = 'physio-column-widths-v19';

const getMinWidthByIndex = (index: number) => {
  if (index === 7 && typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
    return 60;
  }
  return MIN_COL_WIDTH_BY_INDEX[index] ?? MIN_COL_WIDTH;
};

const clampWidthByIndex = (width: number, index: number) => {
  const min = getMinWidthByIndex(index);
  const max = MAX_COL_WIDTH_BY_INDEX[index];
  const minClamped = Math.max(min, width);
  return typeof max === 'number' ? Math.min(max, minClamped) : minClamped;
};

const CHART_NUMBER_COL_INDEX = 1;
const CHART_NUMBER_DEFAULT_WIDTH_FACTOR = 0.392;
const PATIENT_NAME_COL_INDEX = 2;
const PATIENT_NAME_DEFAULT_WIDTH_FACTOR = 0.56;
const GENDER_COL_INDEX = 3;
const GENDER_DEFAULT_WIDTH_FACTOR = 0.8;
const BODY_PART_COL_INDEX = 4;
const BODY_PART_DEFAULT_WIDTH_FACTOR = 0.8;
const TREATMENT_COL_INDEX = 5;
const TREATMENT_DEFAULT_WIDTH_FACTOR = 0.9088;
const MOBILE_TREATMENT_WIDTH_FACTOR = TREATMENT_DEFAULT_WIDTH_FACTOR * 1.2;
const STATUS_COL_INDEX = 6;
const STATUS_DEFAULT_WIDTH_FACTOR = 1.2;
const SPECIAL_NOTE_COL_INDEX = 8;
const SPECIAL_NOTE_DEFAULT_WIDTH = 150;
const AUTHOR_COL_INDEX = 10;
const AUTHOR_DESKTOP_DEFAULT_WIDTH = 61;

const arraysEqual = (a: number[], b: number[]) => (
  a.length === b.length && a.every((value, index) => value === b[index])
);

const getFillTargetIndex = (widths: number[]) => {
  if (FLEX_COL_INDEX < 0) return null;
  if (widths[FLEX_COL_INDEX] > 0) return FLEX_COL_INDEX;
  return null;
};

const normalizeWidthsToTable = (
  widths: number[],
  tableEl: HTMLTableElement | null,
) => {
  if (!tableEl) return widths;

  const next = widths.map((width, index) => (width > 0 ? clampWidthByIndex(width, index) : 0));
  const hostWidth = tableEl.parentElement?.getBoundingClientRect().width ?? tableEl.getBoundingClientRect().width;
  const fillTargetIndex = getFillTargetIndex(next);

  if (!hostWidth || fillTargetIndex === null) return next;

  const visibleWidthSum = next.reduce((sum, width) => sum + (width > 0 ? width : 0), 0);
  const remainingWidth = Math.floor(hostWidth - visibleWidthSum);

  if (remainingWidth <= 0) return next;

  next[fillTargetIndex] += remainingWidth;
  return next;
};


const applyDefaultWidthProfile = (widths: number[]) => {
  const next = [...widths];
  if (next[CHART_NUMBER_COL_INDEX] > 0) {
    next[CHART_NUMBER_COL_INDEX] = clampWidthByIndex(
      next[CHART_NUMBER_COL_INDEX] * CHART_NUMBER_DEFAULT_WIDTH_FACTOR,
      CHART_NUMBER_COL_INDEX
    );
  }
  if (next[PATIENT_NAME_COL_INDEX] > 0) {
    next[PATIENT_NAME_COL_INDEX] = clampWidthByIndex(
      next[PATIENT_NAME_COL_INDEX] * PATIENT_NAME_DEFAULT_WIDTH_FACTOR,
      PATIENT_NAME_COL_INDEX
    );
  }
  if (next[GENDER_COL_INDEX] > 0) {
    next[GENDER_COL_INDEX] = clampWidthByIndex(
      next[GENDER_COL_INDEX] * GENDER_DEFAULT_WIDTH_FACTOR,
      GENDER_COL_INDEX
    );
  }
  if (next[BODY_PART_COL_INDEX] > 0) {
    next[BODY_PART_COL_INDEX] = clampWidthByIndex(
      next[BODY_PART_COL_INDEX] * BODY_PART_DEFAULT_WIDTH_FACTOR,
      BODY_PART_COL_INDEX
    );
  }
  const treatmentFactor =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
      ? MOBILE_TREATMENT_WIDTH_FACTOR
      : TREATMENT_DEFAULT_WIDTH_FACTOR;
  if (next[TREATMENT_COL_INDEX] > 0) {
    next[TREATMENT_COL_INDEX] = clampWidthByIndex(
      next[TREATMENT_COL_INDEX] * treatmentFactor,
      TREATMENT_COL_INDEX
    );
  }
  if (next[STATUS_COL_INDEX] > 0) {
    next[STATUS_COL_INDEX] = clampWidthByIndex(
      next[STATUS_COL_INDEX] * STATUS_DEFAULT_WIDTH_FACTOR,
      STATUS_COL_INDEX
    );
  }
  if (next[SPECIAL_NOTE_COL_INDEX] > 0) {
    next[SPECIAL_NOTE_COL_INDEX] = clampWidthByIndex(SPECIAL_NOTE_DEFAULT_WIDTH, SPECIAL_NOTE_COL_INDEX);
  }
  if (next[AUTHOR_COL_INDEX] > 0) {
    next[AUTHOR_COL_INDEX] = clampWidthByIndex(AUTHOR_DESKTOP_DEFAULT_WIDTH, AUTHOR_COL_INDEX);
  }
  return next;
};

export function useColumnResize(tableRef: React.RefObject<HTMLTableElement | null>) {
  const [columnWidths, setColumnWidths] = useState<number[] | null>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((w, i) => clampWidthByIndex(Number(w) || 0, i));
        }
      }
    } catch { /* ignore */ }
    return null;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [activeResizeColIndex, setActiveResizeColIndex] = useState<number | null>(null);
  const stateRef = useRef<{
    colIndex: number;
    pairedColIndex: number | null;
    startX: number;
    startWidths: number[];
  } | null>(null);
  const widthsRef = useRef<number[] | null>(columnWidths);

  // Keep ref in sync for access inside event listeners
  useEffect(() => { widthsRef.current = columnWidths; }, [columnWidths]);

  const captureWidths = useCallback((): number[] | null => {
    if (!tableRef.current) return null;
    const ths = tableRef.current.querySelectorAll('thead th');
    if (ths.length === 0) return null;
    return Array.from(ths)
      .slice(1)
      .map((th, index) => {
      const hidden = window.getComputedStyle(th).display === 'none';
      if (hidden) return 0;
      return clampWidthByIndex(th.getBoundingClientRect().width, index);
      });
  }, [tableRef]);


  useEffect(() => {
    if (columnWidths) return;
    const id = requestAnimationFrame(() => {
      const widths = captureWidths();
      if (!widths) return;
      setColumnWidths(normalizeWidthsToTable(applyDefaultWidthProfile(widths), tableRef.current));
    });
    return () => cancelAnimationFrame(id);
  }, [columnWidths, captureWidths, tableRef]);

  useEffect(() => {
    if (!columnWidths || isResizing) return;

    const syncToTableWidth = () => {
      setColumnWidths((prev) => {
        if (!prev) return prev;
        const next = normalizeWidthsToTable(prev, tableRef.current);
        return arraysEqual(prev, next) ? prev : next;
      });
    };

    const frameId = requestAnimationFrame(syncToTableWidth);
    window.addEventListener('resize', syncToTableWidth);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', syncToTableWidth);
    };
  }, [columnWidths, isResizing, tableRef]);

  const onResizeStart = useCallback((colIndex: number, clientX: number) => {
    const liveWidths = captureWidths() ?? [];
    const baseWidths = columnWidths ?? applyDefaultWidthProfile(liveWidths);
    if (baseWidths.length === 0) return;

    const widths = baseWidths.map((width, index) => {
      if (liveWidths[index] === 0) return 0;
      return clampWidthByIndex(width, index);
    });

    const normalizedWidths = normalizeWidthsToTable(widths, tableRef.current);

    setColumnWidths(normalizedWidths);

    const pairedColIndex = (() => {
      for (let i = colIndex + 1; i < normalizedWidths.length; i += 1) {
        if (normalizedWidths[i] > 0) return i;
      }
      return null;
    })();

    stateRef.current = { colIndex, pairedColIndex, startX: clientX, startWidths: [...normalizedWidths] };
    setActiveResizeColIndex(colIndex);
    setIsResizing(true);
  }, [columnWidths, captureWidths, tableRef]);

  useEffect(() => {
    if (!isResizing) return;

    const move = (clientX: number) => {
      const s = stateRef.current;
      if (!s) return;
      const delta = clientX - s.startX;
      if (s.startWidths[s.colIndex] <= 0) return;

      // 항상 단일 컬럼 리사이즈만 수행하여 전체 테이블 너비가 늘어나도록 설정 (가로 스크롤 허용)
      const newWidth = clampWidthByIndex(s.startWidths[s.colIndex] + delta, s.colIndex);
      setColumnWidths(prev => {
        if (!prev) return prev;
        const next = [...prev];
        next[s.colIndex] = newWidth;
        return next;
      });
    };

    const onMouseMove = (e: MouseEvent) => { e.preventDefault(); move(e.clientX); };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) { e.preventDefault(); move(e.touches[0].clientX); }
    };
    const onEnd = () => {
      stateRef.current = null;
      setActiveResizeColIndex(null);
      setIsResizing(false);
      // Persist column widths to localStorage
      const current = widthsRef.current;
      if (current) {
        safeSetItem(STORAGE_KEY, JSON.stringify(current));
      }
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onEnd);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, [isResizing]);

  return { columnWidths, isResizing, activeResizeColIndex, onResizeStart };
}
