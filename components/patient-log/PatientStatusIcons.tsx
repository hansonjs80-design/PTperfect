
import React from 'react';
import { Syringe, Hand, Zap, ArrowUpFromLine, Droplet } from 'lucide-react';
import { PatientVisit } from '../../types';

interface PatientStatusIconsProps {
  visit: PatientVisit;
}

export const PatientStatusIcons: React.FC<PatientStatusIconsProps> = ({ visit }) => {
  // Check if any flag is active to conditionally render
  const hasStatus = visit.is_injection || visit.is_fluid || visit.is_manual || visit.is_eswt || visit.is_traction;

  if (!hasStatus) return null;

  return (
    // Changed: Removed pl-2, added justify-center and flex-wrap for column layout
    <div className="flex items-center justify-center flex-wrap gap-1 w-full h-full select-none py-1">
      {visit.is_injection && (
        <div title="주사" className="flex">
          <Syringe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" strokeWidth={2.5} />
        </div>
      )}
      {visit.is_fluid && (
        <div title="수액" className="flex">
          <Droplet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-500" strokeWidth={2.5} />
        </div>
      )}
      {visit.is_manual && (
        <div title="도수치료" className="flex">
          <Hand className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-500" strokeWidth={2.5} />
        </div>
      )}
      {visit.is_eswt && (
        <div title="충격파" className="flex">
          <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" strokeWidth={2.5} />
        </div>
      )}
      {visit.is_traction && (
        <div title="견인" className="flex">
          <ArrowUpFromLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" strokeWidth={2.5} />
        </div>
      )}
    </div>
  );
};
