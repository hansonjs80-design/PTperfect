
import { useState, useRef, useCallback, useEffect } from 'react';

const MIN_COL_WIDTH = 24;
const MIN_COL_WIDTH_BY_INDEX: Record<number, number> = {
  8: 82, // 타이머
  5: 70, // 상태
  9: 96, // 작성
  10: 52, // 삭제
};
export const FLEX_COL_INDEX = 9; // 작성 컬럼이 남는 우측 공간을 채우도록 유연 폭 사용
const STORAGE_KEY = 'physio-column-widths-v8';

const getMinWidthByIndex = (index: number) => {
  if (index === 7 && typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
    return 60;
  }
  return MIN_COL_WIDTH_BY_INDEX[index] ?? MIN_COL_WIDTH;
};

const clampWidthByIndex = (width: number, index: number) => Math.max(getMinWidthByIndex(index), width);


const TREATMENT_COL_INDEX = 3;
const TREATMENT_DEFAULT_WIDTH_FACTOR = 2.03;
const MOBILE_TREATMENT_WIDTH_FACTOR = TREATMENT_DEFAULT_WIDTH_FACTOR * 1.2;
const STATUS_COL_INDEX = 5;
const STATUS_DEFAULT_WIDTH_FACTOR = 1.5;
const SPECIAL_NOTE_COL_INDEX = 7;
const SPECIAL_NOTE_DEFAULT_WIDTH = 150;
const AUTHOR_COL_INDEX = 9;
const AUTHOR_DESKTOP_DEFAULT_WIDTH = 96;

const arraysEqual = (a: number[], b: number[]) => (
  a.length === b.length && a.every((value, index) => value === b[index])
);

const getFillTargetIndex = (widths: number[]) => {
  if (FLEX_COL_INDEX >= 0 && widths[FLEX_COL_INDEX] > 0) return FLEX_COL_INDEX;
  for (let i = widths.length - 1; i >= 0; i -= 1) {
    if (widths[i] > 0) return i;
  }
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
      const saved = localStorage.getItem(STORAGE_KEY);
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
    return Array.from(ths).map((th, index) => {
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

      // 기본: 선택한 경계(핸들) 기준으로 좌/우 컬럼을 동시에 조정해
      // 선택한 보더만 이동하는 것처럼 동작시킨다.
      if (s.pairedColIndex !== null && s.startWidths[s.pairedColIndex] > 0) {
        const leftMin = MIN_COL_WIDTH_BY_INDEX[s.colIndex] ?? MIN_COL_WIDTH;
        const rightMin = MIN_COL_WIDTH_BY_INDEX[s.pairedColIndex] ?? MIN_COL_WIDTH;
        const maxExpand = s.startWidths[s.pairedColIndex] - rightMin;
        const maxShrink = s.startWidths[s.colIndex] - leftMin;
        const safeDelta = Math.min(Math.max(delta, -maxShrink), maxExpand);
        const leftWidth = clampWidthByIndex(s.startWidths[s.colIndex] + safeDelta, s.colIndex);
        const rightWidth = clampWidthByIndex(s.startWidths[s.pairedColIndex] - safeDelta, s.pairedColIndex);

        setColumnWidths(prev => {
          if (!prev) return prev;
          const next = [...prev];
          next[s.colIndex] = leftWidth;
          next[s.pairedColIndex!] = rightWidth;
          return next;
        });
        return;
      }

      // 예외: 마지막 컬럼 등 짝 컬럼이 없을 때는 단일 컬럼 리사이즈
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
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch { /* ignore */ }
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
