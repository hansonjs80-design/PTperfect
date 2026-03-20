
import React from 'react';

interface PatientLogTableHeaderProps {
  onResizeStart?: (colIndex: number, clientX: number) => void;
  isResizing?: boolean;
  activeResizeColIndex?: number | null;
  showTimerColumn?: boolean;
}

const RESIZABLE_COLUMNS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const ALWAYS_VISIBLE_HANDLE_COLUMNS = new Set([7, 9]);

const thBase =
  'py-3.5 px-1.5 text-xs md:text-sm font-extrabold text-slate-600 dark:text-slate-300 tracking-[0.02em] text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0';

export const PatientLogTableHeader: React.FC<PatientLogTableHeaderProps> = ({
  onResizeStart,
  isResizing,
  activeResizeColIndex = null,
  showTimerColumn = false,
}) => {
  const handle = (colIndex: number) => {
    if (!onResizeStart || !RESIZABLE_COLUMNS.has(colIndex)) return null;
    return (
      <div
        className="absolute top-0 right-[-7px] w-[16px] h-full z-20 flex items-center justify-center cursor-col-resize touch-none"
        onMouseDown={(e) => {
          e.preventDefault();
          onResizeStart(colIndex, e.clientX);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          onResizeStart(colIndex, e.touches[0].clientX);
        }}
      >
        <div
          className={`w-[2px] rounded-full transition-all duration-150 ${
            activeResizeColIndex === colIndex
              ? 'h-[90%] bg-blue-500'
              : isResizing
                ? 'h-[60%] bg-transparent'
                : ALWAYS_VISIBLE_HANDLE_COLUMNS.has(colIndex)
                  ? 'h-[60%] bg-blue-300/50 hover:bg-blue-400/70'
                  : 'h-[60%] bg-transparent hover:bg-blue-400/60'
          }`}
        />
      </div>
    );
  };

  return (
    <thead className="sticky top-0 bg-sky-100/95 dark:bg-slate-700/95 z-10 shadow-sm border-b-2 border-sky-200 dark:border-slate-500 backdrop-blur-md">
      <tr>
        <th className={`${thBase} w-[30px] md:w-[40px] relative`}>
          NO
          {handle(0)}
        </th>
        <th className={`${thBase} w-[55px] md:w-[95px] xl:w-[75px] relative`}>
          이름
          {handle(1)}
        </th>
        <th className={`${thBase} w-[40px] md:w-[56px] xl:w-[52px] relative`}>
          성별
          {handle(2)}
        </th>
        <th className={`${thBase} w-[55px] md:w-[120px] xl:w-[105px] relative`}>
          부위
          {handle(3)}
        </th>
        <th className={`${thBase} w-[365px] md:w-[304px] xl:w-[304px] relative`}>
          처방 목록
          {handle(4)}
        </th>
        <th className={`${thBase} w-[96px] md:w-[132px] xl:w-[117px] relative`}>
          추가 사항
          {handle(5)}
        </th>
        <th className={`${thBase} w-[45px] md:w-[160px] xl:w-[100px] relative`}>
          메모
          {handle(6)}
        </th>
        <th className={`${thBase} w-[95px] md:w-[190px] xl:w-[150px] relative`}>
          특이사항
          {handle(7)}
        </th>
        <th className={`${thBase} w-[82px] md:w-[110px] xl:w-[100px] relative ${showTimerColumn ? "" : "hidden"}`}>
          타이머
          {handle(8)}
        </th>
        <th className={`${thBase} w-[96px] min-w-[96px] max-w-[96px] relative whitespace-nowrap`}>
          작성
          {handle(9)}
        </th>
        <th className={`${thBase} min-w-[52px] relative whitespace-nowrap`}>
          삭제
        </th>
      </tr>
    </thead>
  );
};
