
import React from 'react';

export const PatientLogTableHeader: React.FC = () => {
  return (
    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700">
      <tr>
        <th className="py-3 px-1 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[30px] md:w-[40px] text-center">
          No.
        </th>
        <th className="py-3 px-1 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[55px] md:w-[95px] xl:w-[75px] text-center">
          이름
        </th>
        <th className="py-3 px-1 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[55px] md:w-[120px] xl:w-[90px] text-center">
          부위
        </th>
        {/* Adjusted Treatment List Column: w-[150px] on mobile, auto on desktop */}
        <th className="py-3 px-1 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[150px] md:w-auto text-center">
          처방 목록
        </th>
        <th className="py-3 px-1 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[38px] md:w-[70px] xl:w-[60px] text-center">
          상태
        </th>
        <th className="py-3 px-1 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[45px] md:w-[160px] xl:w-[100px] text-center">
          메모
        </th>
        <th className="py-3 px-1 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[30px] md:w-[70px] xl:w-[50px] text-center">
          작성
        </th>
        <th className="py-3 px-1 w-[20px] md:w-[24px]"></th>
      </tr>
    </thead>
  );
};
