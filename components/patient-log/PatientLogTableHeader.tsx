
import React from 'react';

interface PatientLogTableHeaderProps {
  onResizeStart?: (colIndex: number, clientX: number, invert?: boolean) => void;
  isResizing?: boolean;
}

const RESIZABLE_COLUMNS = new Set([0, 1, 2, 4, 5, 6, 7]);

const thBase =
  'py-3 px-1 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center border-r border-slate-300 dark:border-slate-600 last:border-r-0';

export const PatientLogTableHeader: React.FC<PatientLogTableHeaderProps> = ({
  onResizeStart,
  isResizing,
}) => {
  const handle = (colIndex: number) => {
    if (!onResizeStart || !RESIZABLE_COLUMNS.has(colIndex)) return null;
    return (
      <div
        className="absolute top-0 -right-[4px] w-[9px] h-full z-20 hidden md:portrait:flex lg:flex items-center justify-center cursor-col-resize touch-none"
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
          className={`w-[3px] h-[60%] rounded-full transition-colors duration-150 ${
            isResizing
              ? 'bg-blue-400/50'
              : 'bg-transparent hover:bg-blue-400/60'
          }`}
        />
      </div>
    );
  };

  return (
    <thead className="sticky top-0 bg-slate-200 dark:bg-slate-800 z-10 shadow-sm border-b-2 border-slate-300 dark:border-slate-600 backdrop-blur-sm">
      <tr>
        <th className={`${thBase} w-[30px] md:w-[40px] relative`}>
          No.
          {handle(0)}
        </th>
        <th className={`${thBase} w-[55px] md:w-[95px] xl:w-[75px] relative`}>
          이름
          {handle(1)}
        </th>
        <th className={`${thBase} w-[55px] md:w-[120px] xl:w-[105px] relative`}>
          부위
          {handle(2)}
        </th>
        <th className={`${thBase} w-[150px] md:w-auto relative`}>
          처방 목록
          {onResizeStart && (
            <div
              className="absolute top-0 -right-[4px] w-[9px] h-full z-20 hidden md:portrait:flex lg:flex items-center justify-center cursor-col-resize touch-none"
              onMouseDown={(e) => {
                e.preventDefault();
                onResizeStart(4, e.clientX, true);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                onResizeStart(4, e.touches[0].clientX, true);
              }}
            >
              <div
                className={`w-[3px] h-[60%] rounded-full transition-colors duration-150 ${
                  isResizing
                    ? 'bg-blue-400/50'
                    : 'bg-transparent hover:bg-blue-400/60'
                }`}
              />
            </div>
          )}
        </th>
        <th className={`${thBase} w-[45px] md:w-[160px] xl:w-[100px] relative`}>
          메모
          {handle(4)}
        </th>
        <th className={`${thBase} w-[82px] md:w-[110px] xl:w-[100px] relative`}>
          타이머
          {handle(5)}
        </th>
        <th className={`${thBase} w-[38px] md:w-[70px] xl:w-[60px] relative`}>
          상태
          {handle(6)}
        </th>
        <th className={`${thBase} w-[30px] md:w-[70px] xl:w-[50px] relative`}>
          작성
          {handle(7)}
        </th>
        <th className="py-3 px-1 w-[20px] md:w-[24px]"></th>
      </tr>
    </thead>
  );
};
