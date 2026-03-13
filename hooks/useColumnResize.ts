
import { useState, useRef, useCallback, useEffect } from 'react';

const MIN_COL_WIDTH = 24;
const MIN_COL_WIDTH_BY_INDEX: Record<number, number> = {
  6: 82, // 타이머
  7: 70, // 상태
  8: 70, // 작성
};
export const FLEX_COL_INDEX = -1; // 모든 컬럼을 고정 폭으로 리사이즈
const STORAGE_KEY = 'physio-column-widths';

const clampWidthByIndex = (width: number, index: number) => Math.max(MIN_COL_WIDTH_BY_INDEX[index] ?? MIN_COL_WIDTH, width);


const TREATMENT_COL_INDEX = 3;
const TREATMENT_DEFAULT_WIDTH_FACTOR = 1.3;
const STATUS_COL_INDEX = 7;
const STATUS_DEFAULT_WIDTH_FACTOR = 1.5;


const applyDefaultWidthProfile = (widths: number[]) => {
  const next = [...widths];
  if (next[TREATMENT_COL_INDEX] > 0) {
    next[TREATMENT_COL_INDEX] = clampWidthByIndex(
      next[TREATMENT_COL_INDEX] * TREATMENT_DEFAULT_WIDTH_FACTOR,
      TREATMENT_COL_INDEX
    );
  }
  if (next[STATUS_COL_INDEX] > 0) {
    next[STATUS_COL_INDEX] = clampWidthByIndex(
      next[STATUS_COL_INDEX] * STATUS_DEFAULT_WIDTH_FACTOR,
      STATUS_COL_INDEX
    );
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
  const stateRef = useRef<{
    colIndex: number;
    startX: number;
    startWidths: number[];
    invert: boolean;
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

  const onResizeStart = useCallback((colIndex: number, clientX: number, invert = false) => {
    const widths = columnWidths ?? applyDefaultWidthProfile(captureWidths() ?? []);
    if (widths.length === 0) return;
    if (!columnWidths) setColumnWidths(widths);

    stateRef.current = { colIndex, startX: clientX, startWidths: [...widths], invert };
    setIsResizing(true);
  }, [columnWidths, captureWidths]);

  useEffect(() => {
    if (!isResizing) return;

    const move = (clientX: number) => {
      const s = stateRef.current;
      if (!s) return;
      const delta = clientX - s.startX;
      if (s.startWidths[s.colIndex] <= 0) return;
      const newWidth = clampWidthByIndex(s.startWidths[s.colIndex] + (s.invert ? -delta : delta), s.colIndex);

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

  return { columnWidths, isResizing, onResizeStart };
}
