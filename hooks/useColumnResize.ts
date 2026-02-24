
import { useState, useRef, useCallback, useEffect } from 'react';

const MIN_COL_WIDTH = 24;
export const FLEX_COL_INDEX = 3; // 처방 목록 — always auto (absorbs remaining space)

export function useColumnResize(tableRef: React.RefObject<HTMLTableElement | null>) {
  const [columnWidths, setColumnWidths] = useState<number[] | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const stateRef = useRef<{
    colIndex: number;
    startX: number;
    startWidths: number[];
  } | null>(null);

  const captureWidths = useCallback((): number[] | null => {
    if (!tableRef.current) return null;
    const ths = tableRef.current.querySelectorAll('thead th');
    if (ths.length === 0) return null;
    return Array.from(ths).map(th => th.getBoundingClientRect().width);
  }, [tableRef]);

  const onResizeStart = useCallback((colIndex: number, clientX: number) => {
    const widths = columnWidths ?? captureWidths();
    if (!widths) return;
    if (!columnWidths) setColumnWidths(widths);

    stateRef.current = { colIndex, startX: clientX, startWidths: [...widths] };
    setIsResizing(true);
  }, [columnWidths, captureWidths]);

  useEffect(() => {
    if (!isResizing) return;

    const move = (clientX: number) => {
      const s = stateRef.current;
      if (!s) return;
      const delta = clientX - s.startX;
      const newWidth = Math.max(MIN_COL_WIDTH, s.startWidths[s.colIndex] + delta);

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
