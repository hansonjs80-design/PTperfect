
import { useState, useRef, useCallback, useEffect } from 'react';

const MIN_COL_WIDTH = 24;
const MIN_COL_WIDTH_BY_INDEX: Record<number, number> = {
  8: 82, // 타이머
  5: 70, // 상태
  9: 40, // 작성
  10: 15, // 삭제(쓰레기통)
};
export const FLEX_COL_INDEX = -1; // 모든 컬럼을 고정 폭으로 리사이즈
const STORAGE_KEY = 'physio-column-widths-v4';

const clampWidthByIndex = (width: number, index: number) => Math.max(MIN_COL_WIDTH_BY_INDEX[index] ?? MIN_COL_WIDTH, width);


const TREATMENT_COL_INDEX = 3;
const TREATMENT_DEFAULT_WIDTH_FACTOR = 2.03;
const MOBILE_TREATMENT_WIDTH_FACTOR = TREATMENT_DEFAULT_WIDTH_FACTOR * 1.2;
const STATUS_COL_INDEX = 5;
const STATUS_DEFAULT_WIDTH_FACTOR = 1.5;
const AUTHOR_COL_INDEX = 9;
const AUTHOR_DESKTOP_DEFAULT_WIDTH = 40;


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
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  if (isDesktop && next[AUTHOR_COL_INDEX] > 0) {
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
      setColumnWidths(applyDefaultWidthProfile(widths));
    });
    return () => cancelAnimationFrame(id);
  }, [columnWidths, captureWidths]);

  const onResizeStart = useCallback((colIndex: number, clientX: number) => {
    const widths = columnWidths ?? applyDefaultWidthProfile(captureWidths() ?? []);
    if (widths.length === 0) return;
    if (!columnWidths) setColumnWidths(widths);

    const pairedColIndex = (() => {
      for (let i = colIndex + 1; i < widths.length; i += 1) {
        if (widths[i] > 0) return i;
      }
      return null;
    })();

    stateRef.current = { colIndex, pairedColIndex, startX: clientX, startWidths: [...widths] };
    setActiveResizeColIndex(colIndex);
    setIsResizing(true);
  }, [columnWidths, captureWidths]);

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
