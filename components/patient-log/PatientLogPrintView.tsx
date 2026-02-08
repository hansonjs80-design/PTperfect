
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
  return (
    <div id={id} className={`${className} bg-white text-black p-8 sm:p-12`}>
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

      {/* Single Column Layout (1열) */}
      <div className="w-full flex flex-col">
         {visits.map((visit, index) => (
           <div 
             key={visit.id} 
             // Darkened border from gray-400 to gray-600 (approx 50% darker)
             className="break-inside-avoid page-break-inside-avoid border-b border-gray-600 py-2 flex items-center gap-2 sm:gap-4"
           >
              {/* No. (Room Number) - Updated to 12px font-black */}
              <div className="w-8 sm:w-12 shrink-0 font-black text-gray-900 text-center text-[12px]">
                 {visit.bed_id || (index + 1)}
              </div>
              
              {/* Name - Updated to 11px font-black */}
              <div className="w-16 sm:w-20 shrink-0 font-black text-[11px] text-gray-900 whitespace-nowrap overflow-visible px-1">
                 {visit.patient_name || "-"}
              </div>
              
              {/* Body Part - Updated to 11px font-bold */}
              <div className="w-16 sm:w-20 shrink-0 font-bold text-[11px] text-gray-600 text-center whitespace-nowrap overflow-visible px-1">
                 {visit.body_part || "-"}
              </div>
              
              {/* Treatment - Updated to 11px font-bold */}
              <div className="flex-1 text-gray-800 font-bold text-[11px] whitespace-nowrap overflow-visible px-1">
                 {visit.treatment_name || "-"}
              </div>

              {/* Status Icons Column - New for Print View */}
              <div className="w-10 sm:w-14 shrink-0 flex items-center justify-center">
                 <PatientStatusIcons visit={visit} />
              </div>
              
              {/* Memo - Updated to 11px font-bold */}
              <div className="w-24 sm:w-32 shrink-0 font-bold text-[11px] text-gray-500 text-right whitespace-nowrap overflow-visible px-1">
                 {visit.memo || ""}
              </div>
           </div>
         ))}
         
         {/* Fill empty space for paper feel - Removed border-b to make lines invisible */}
         {Array.from({ length: Math.max(0, 15 - visits.length) }).map((_, i) => (
           <div key={`empty-${i}`} className="break-inside-avoid py-3"></div>
         ))}
      </div>
      
      <div className="fixed bottom-4 left-0 w-full text-center text-[8pt] text-gray-300 uppercase tracking-wider">
        PhysioTrack Pro - Printed on {new Date().toLocaleString()}
      </div>
    </div>
  );
};
