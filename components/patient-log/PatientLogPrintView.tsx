
import React from 'react';
import { PatientVisit } from '../../types';
import { PatientStatusIcons } from './PatientStatusIcons';

interface PatientLogPrintViewProps {
  visits: PatientVisit[];
  currentDate: string;
  className?: string; // Allow overriding styles for Preview mode
  id?: string; // Allow dynamic ID to prevent collisions
}

export const PatientLogPrintView: React.FC<PatientLogPrintViewProps> = ({ 
  visits, 
  currentDate,
  className = "hidden print-only-visible print:block", // Default: Hidden on screen, visible on print
  id = "print-target-content"
}) => {
  // Common width classes to ensure Header and Body align perfectly
  const widthClasses = {
    no: "w-8 sm:w-12",
    name: "w-16 sm:w-20",
    part: "w-16 sm:w-20",
    treatment: "flex-1",
    status: "w-10 sm:w-14",
    memo: "w-24 sm:w-32"
  };

  // Vertical border style: Lighter than the row border
  const vBorder = "border-r border-gray-300";

  return (
    <div id={id} className={`${className} bg-white text-black p-8 sm:p-12 font-sans`}>
      {/* Header: Flexbox for Left Title / Right Info */}
      <div className="flex justify-between items-end mb-4 pb-6 border-b-2 border-black">
         <h1 className="text-xl sm:text-2xl font-black text-black leading-snug tracking-tight">환자 현황</h1>
         <div className="flex items-center gap-3 text-sm font-bold text-gray-600 mb-1.5">
            <span className="text-gray-500">{currentDate}</span>
            <span className="w-px h-3 bg-gray-300"></span>
            <span className="text-black text-base font-black">
              총 {visits.length}명
            </span>
         </div>
      </div>

      {/* Table Header */}
      <div className="w-full border-t-2 border-black border-b border-gray-600 flex bg-gray-100 items-center text-xs font-black text-gray-900 text-center select-none">
         <div className={`${widthClasses.no} py-1.5 ${vBorder}`}>No.</div>
         <div className={`${widthClasses.name} py-1.5 ${vBorder}`}>이름</div>
         <div className={`${widthClasses.part} py-1.5 ${vBorder}`}>부위</div>
         <div className={`${widthClasses.treatment} py-1.5 ${vBorder}`}>처방명</div>
         <div className={`${widthClasses.status} py-1.5 ${vBorder}`}>상태</div>
         <div className={`${widthClasses.memo} py-1.5`}>메모</div>
      </div>

      {/* Single Column Layout (Rows) */}
      <div className="w-full flex flex-col border-l border-gray-300 border-r border-gray-300">
         {visits.map((visit, index) => (
           <div 
             key={visit.id} 
             // Darkened horizontal border (gray-600) per request, removed gap to make vertical lines connect
             // Use items-stretch to ensure vertical borders extend full height
             className="break-inside-avoid page-break-inside-avoid border-b border-gray-600 flex items-stretch"
           >
              {/* No. (Room Number) - Centered Vertically & Horizontally */}
              <div className={`${widthClasses.no} shrink-0 font-black text-gray-900 flex items-center justify-center text-[12px] py-1.5 ${vBorder}`}>
                 {visit.bed_id || (index + 1)}
              </div>
              
              {/* Name - Centered Vertically & Horizontally */}
              <div className={`${widthClasses.name} shrink-0 font-black text-[11px] text-gray-900 flex items-center justify-center whitespace-nowrap overflow-hidden px-1 py-1.5 ${vBorder}`}>
                 {visit.patient_name || "-"}
              </div>
              
              {/* Body Part - Centered Vertically & Horizontally */}
              <div className={`${widthClasses.part} shrink-0 font-bold text-[11px] text-gray-600 flex items-center justify-center whitespace-nowrap overflow-hidden px-1 py-1.5 ${vBorder}`}>
                 {visit.body_part || "-"}
              </div>
              
              {/* Treatment - Centered Vertically, Left Aligned */}
              <div className={`${widthClasses.treatment} text-gray-800 font-bold text-[11px] flex items-center whitespace-nowrap overflow-hidden px-2 py-1.5 ${vBorder}`}>
                 {visit.treatment_name || "-"}
              </div>

              {/* Status Icons Column - Centered Vertically & Horizontally */}
              <div className={`${widthClasses.status} shrink-0 flex items-center justify-center py-1.5 ${vBorder}`}>
                 <PatientStatusIcons visit={visit} />
              </div>
              
              {/* Memo - Centered Vertically & Horizontally */}
              <div className={`${widthClasses.memo} shrink-0 font-bold text-[11px] text-gray-500 flex items-center justify-center whitespace-nowrap overflow-hidden px-1 py-1.5`}>
                 {visit.memo || ""}
              </div>
           </div>
         ))}
         
         {/* Fill empty space for paper feel (Reduced height py-3) */}
         {Array.from({ length: Math.max(0, 15 - visits.length) }).map((_, i) => (
           <div key={`empty-${i}`} className="break-inside-avoid py-3 border-b border-gray-200"></div>
         ))}
      </div>
      
      <div className="fixed bottom-4 left-0 w-full text-center text-[8pt] text-gray-300 uppercase tracking-wider">
        PhysioTrack Pro - Printed on {new Date().toLocaleString()}
      </div>
    </div>
  );
};
