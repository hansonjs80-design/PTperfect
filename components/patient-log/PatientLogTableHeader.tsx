
import React from 'react';

interface PatientLogTableHeaderProps {
  onResizeStart?: (colIndex: number, clientX: number, invert?: boolean) => void;
  isResizing?: boolean;
  showTimerColumn?: boolean;
}

const RESIZABLE_COLUMNS = new Set([0, 1, 2, 3, 4, 6, 7, 8]);

const thBase =
  'py-3.5 px-1.5 text-[11px] md:text-xs font-extrabold text-slate-600 dark:text-slate-300 tracking-[0.02em] text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0';

export const PatientLogTableHeader: React.FC<PatientLogTableHeaderProps> = ({
  onResizeStart,
  isResizing,
  showTimerColumn = false,
}) => {
  const handle = (colIndex: number, side: 'left' | 'right' = 'left') => {
    if (!onResizeStart || !RESIZABLE_COLUMNS.has(colIndex)) return null;
    const isLeft = side === 'left';
    return (
      <div
        className={`absolute top-0 ${isLeft ? 'left-0' : 'right-0'} w-[6px] h-full z-20 hidden md:portrait:flex lg:flex items-center justify-center cursor-col-resize touch-none`}
        onMouseDown={(e) => {
          e.preventDefault();
          onResizeStart(colIndex, e.clientX, isLeft);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          onResizeStart(colIndex, e.touches[0].clientX, isLeft);
        }}
      >
        <div
          className={`w-[2px] h-[60%] rounded-full transition-colors duration-150 ${
            isResizing
              ? 'bg-blue-400/50'
              : 'bg-transparent hover:bg-blue-400/60'
          }`}
        />
      </div>
    );
  };

  return (
    <thead className="sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700 backdrop-blur-md">
      <tr>
        <th className={`${thBase} w-[30px] md:w-[40px] relative`}>
          NO
          {handle(0, 'right')}
        </th>
        <th className={`${thBase} w-[55px] md:w-[95px] xl:w-[75px] relative`}>
          이름
          {handle(1, 'left')}
        </th>
        <th className={`${thBase} w-[55px] md:w-[120px] xl:w-[105px] relative`}>
          부위
          {handle(2, 'left')}
        </th>
        <th className={`${thBase} w-[234px] md:w-[234px] xl:w-[234px] relative`}>
          처방 목록
          {handle(3, 'left')}
        </th>
        <th className={`${thBase} w-[45px] md:w-[160px] xl:w-[100px] relative`}>
          메모
          {handle(4, 'left')}
        </th>
        <th className={`${thBase} w-[70px] md:w-[170px] xl:w-[130px] relative hidden`}>
          특이사항
        </th>
        <th className={`${thBase} w-[82px] md:w-[110px] xl:w-[100px] relative ${showTimerColumn ? "" : "hidden"}`}>
          타이머
          {handle(6, 'left')}
        </th>
        <th className={`${thBase} w-[64px] md:w-[88px] xl:w-[78px] relative`}>
          상태
          {handle(7, 'left')}
        </th>
        <th className={`${thBase} w-[64px] md:w-[88px] xl:w-[78px] relative`}>
          작성
          {handle(8, 'left')}
        </th>
        <th className="py-3 px-1 w-[20px] md:w-[24px]"></th>
      </tr>
    </thead>
  );
};
