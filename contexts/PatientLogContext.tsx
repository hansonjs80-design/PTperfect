
import React, { createContext, useContext, ReactNode } from 'react';
import { usePatientLog } from '../hooks/usePatientLog';
import { PatientVisit } from '../types';

interface PatientLogContextType {
  currentDate: string;
  setCurrentDate: (date: string) => void;
  visits: PatientVisit[];
  isLoading: boolean;
  addVisit: (data?: Partial<PatientVisit>) => Promise<string>;
  updateVisit: (id: string, updates: Partial<PatientVisit>) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
  changeDate: (offset: number) => void;
}

const PatientLogContext = createContext<PatientLogContextType | undefined>(undefined);

export const PatientLogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const patientLog = usePatientLog();

  return (
    <PatientLogContext.Provider value={patientLog}>
      {children}
    </PatientLogContext.Provider>
  );
};

export const usePatientLogContext = () => {
  const context = useContext(PatientLogContext);
  if (context === undefined) {
    throw new Error('usePatientLogContext must be used within a PatientLogProvider');
  }
  return context;
};
