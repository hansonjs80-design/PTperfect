import React from 'react';
import { Database } from 'lucide-react';
import { ConnectionConfig } from './settings/ConnectionConfig';
import { MaintenanceTools } from './settings/MaintenanceTools';

interface SettingsDatabaseTabProps {
  onResetAllBeds: () => void;
  onClosePanel: () => void;
}

export const SettingsDatabaseTab: React.FC<SettingsDatabaseTabProps> = ({ onResetAllBeds, onClosePanel }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-200 pb-20 sm:pb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Database className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">연결 설정</span>
      </div>
      
      <ConnectionConfig />
      
      <div className="h-px bg-gray-200 dark:bg-slate-700 my-4" />
      
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">유지 보수</span>
      </div>

      <MaintenanceTools 
        onResetAllBeds={onResetAllBeds} 
        onClosePanel={onClosePanel} 
      />
    </div>
  );
};