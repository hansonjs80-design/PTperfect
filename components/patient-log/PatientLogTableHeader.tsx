
import React from 'react';

interface PatientLogTableHeaderProps {
  onResizeStart?: (colIndex: number, clientX: number) => void;
  isResizing?: boolean;
  activeResizeColIndex?: number | null;
  showTimerColumn?: boolean;
}

const RESIZABLE_COLUMNS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const ALWAYS_VISIBLE_HANDLE_COLUMNS = new Set<number>();

const thBase =
  'py-3.5 px-1.5 text-xs md:text-sm font-extrabold text-slate-700 dark:text-slate-200 tracking-[0.02em] text-center border-r border-slate-400 dark:border-slate-500';

export const PatientLogTableHeader: React.FC<PatientLogTableHeaderProps> = ({
  onResizeStart,
  isResizing,
  activeResizeColIndex = null,
  showTimerColumn = false,
}) => {
  const handle = (colIndex: number, side: 'right' | 'left' = 'right') => {
    if (!onResizeStart || !RESIZABLE_COLUMNS.has(colIndex)) return null;
    return (
      <div
        className={`absolute top-0 ${side === 'right' ? 'right-[-9px]' : 'left-[-9px]'} w-[20px] h-full z-30 flex items-center justify-center cursor-col-resize touch-none`}
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
    <thead className="sticky top-0 bg-sky-200/95 dark:bg-slate-700 z-10 shadow-sm border-b-2 border-sky-300 dark:border-slate-400 backdrop-blur-md">
      <tr>
        <th className="py-3.5 px-0 w-[34px] min-w-[34px] max-w-[34px] border-r border-slate-400 dark:border-slate-500 bg-slate-200/90 dark:bg-slate-800/95" />
        <th className={`${thBase} w-[30px] md:w-[40px] relative`}>
          NO
          {handle(0)}
        </th>
        <th className={`${thBase} w-[50px] md:w-[70px] xl:w-[60px] relative`}>
          차트 번호
          {handle(1)}
        </th>
        <th className={`${thBase} w-[55px] md:w-[95px] xl:w-[75px] relative`}>
          이름
          {handle(2)}
        </th>
        <th className={`${thBase} w-[40px] md:w-[56px] xl:w-[52px] relative`}>
          성별
          {handle(3)}
        </th>
        <th className={`${thBase} w-[55px] md:w-[120px] xl:w-[105px] relative`}>
          부위
          {handle(4)}
        </th>
        <th className={`${thBase} w-[365px] md:w-[304px] xl:w-[304px] relative`}>
          처방 목록
          {handle(5)}
        </th>
        <th className={`${thBase} w-[96px] md:w-[132px] xl:w-[117px] relative`}>
          추가 사항
          {handle(6)}
        </th>
        <th className={`${thBase} w-[45px] md:w-[160px] xl:w-[100px] relative`}>
          메모
          {handle(7)}
        </th>
        <th className={`${thBase} w-[95px] md:w-[190px] xl:w-[150px] relative`}>
          특이사항
          {handle(8)}
        </th>
        <th className={`${thBase} w-[82px] md:w-[110px] xl:w-[100px] relative ${showTimerColumn ? "" : "hidden"}`}>
          타이머
          {handle(9)}
        </th>
        <th className={`${thBase} w-[56px] min-w-[56px] max-w-[56px] xl:w-[68px] xl:min-w-[68px] xl:max-w-[68px] relative`}>
          작성
        </th>
      </tr>
    </thead>
  );
};
