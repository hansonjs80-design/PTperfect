
import React from 'react';
import { TreatmentProvider } from './contexts/TreatmentContext';
import { PatientLogProvider } from './contexts/PatientLogContext';
import { MainLayout } from './components/MainLayout';

const App: React.FC = () => {
  return (
    <PatientLogProvider>
      <TreatmentProvider>
        <MainLayout />
      </TreatmentProvider>
    </PatientLogProvider>
  );
};

export default App;
