
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
  // Use colgroup for fixed widths to ensure table layout stability
  // Widths roughly mimic the previous flex-basis percentages/pixels
  const colWidths = (
    <colgroup>
      <col className="w-[8%]" />  {/* No */}
      <col className="w-[12%]" /> {/* Name */}
      <col className="w-[12%]" /> {/* Part */}
      <col className="w-[38%]" /> {/* Treatment (Flexible) */}
      <col className="w-[10%]" /> {/* Status */}
      <col className="w-[20%]" /> {/* Memo */}
    </colgroup>
  );

  return (
    <div id={id} className={`${className} bg-white text-black p-8 sm:p-12 font-sans`}>
      {/* Header Section */}
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

      {/* 
        Table Layout Implementation
        Tables render much more reliably in html2pdf/html2canvas for vertical alignment and borders 
        compared to nested Flexbox structures.
      */}
      <table className="w-full border-collapse table-fixed text-[11px]">
        {colWidths}
        
        <thead>
          {/* Removed border-t-2 border-black as requested */}
          <tr className="bg-gray-100 border-b border-gray-600 text-xs font-black text-gray-900 text-center">
            <th className="py-2 border-r border-gray-300">No.</th>
            <th className="py-2 border-r border-gray-300">이름</th>
            <th className="py-2 border-r border-gray-300">부위</th>
            <th className="py-2 border-r border-gray-300">처방명</th>
            <th className="py-2 border-r border-gray-300">상태</th>
            <th className="py-2">메모</th>
          </tr>
        </thead>

        <tbody>
          {visits.map((visit, index) => (
            <tr 
              key={visit.id} 
              className="border-b border-gray-400 break-inside-avoid page-break-inside-avoid"
            >
              {/* 
                align-middle is crucial for PDF generation vertical alignment.
                Using simple padding (py-1.5) ensures content doesn't touch edges.
              */}
              <td className="py-1.5 px-1 border-r border-gray-300 align-middle text-center font-black text-gray-900">
                {visit.bed_id || (index + 1)}
              </td>
              
              <td className="py-1.5 px-1 border-r border-gray-300 align-middle text-center font-black text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                {visit.patient_name || "-"}
              </td>
              
              <td className="py-1.5 px-1 border-r border-gray-300 align-middle text-center font-bold text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
                {visit.body_part || "-"}
              </td>
              
              <td className="py-1.5 px-2 border-r border-gray-300 align-middle text-left font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                {visit.treatment_name || "-"}
              </td>

              <td className="py-1.5 px-1 border-r border-gray-300 align-middle text-center">
                <div className="flex items-center justify-center h-full w-full">
                   <PatientStatusIcons visit={visit} />
                </div>
              </td>
              
              <td className="py-1.5 px-1 align-middle text-center font-bold text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">
                {visit.memo || ""}
              </td>
            </tr>
          ))}

          {/* Fill empty space rows for aesthetic paper look */}
          {Array.from({ length: Math.max(0, 15 - visits.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className="border-b border-gray-200 break-inside-avoid">
              <td className="py-3 border-r border-gray-100">&nbsp;</td>
              <td className="py-3 border-r border-gray-100">&nbsp;</td>
              <td className="py-3 border-r border-gray-100">&nbsp;</td>
              <td className="py-3 border-r border-gray-100">&nbsp;</td>
              <td className="py-3 border-r border-gray-100">&nbsp;</td>
              <td className="py-3">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="fixed bottom-4 left-0 w-full text-center text-[8pt] text-gray-300 uppercase tracking-wider">
        PhysioTrack Pro - Printed on {new Date().toLocaleString()}
      </div>
    </div>
  );
};
