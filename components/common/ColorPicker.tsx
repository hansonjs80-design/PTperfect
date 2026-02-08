import React from 'react';
import { ChevronDown, Palette } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (colorClass: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  { label: '빨강', value: 'bg-red-500', hex: '#ef4444' },
  { label: '파랑', value: 'bg-blue-500', hex: '#3b82f6' },
  { label: '보라', value: 'bg-purple-500', hex: '#a855f7' },
  { label: '초록', value: 'bg-green-500', hex: '#22c55e' },
  { label: '주황', value: 'bg-orange-500', hex: '#f97316' },
  { label: '회색', value: 'bg-gray-500', hex: '#6b7280' },
  { label: '분홍', value: 'bg-pink-500', hex: '#ec4899' },
  { label: '청록', value: 'bg-cyan-500', hex: '#06b6d4' },
  { label: '노랑', value: 'bg-yellow-500', hex: '#eab308' },
  { label: '하늘', value: 'bg-sky-500', hex: '#0ea5e9' },
  { label: '바이올렛', value: 'bg-violet-500', hex: '#8b5cf6' },
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, className }) => {
  const isCustom = value.startsWith('bg-[#');
  const customHex = isCustom ? value.replace('bg-[', '').replace(']', '') : '#000000';

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') return; // Do nothing, user picks from input
    onChange(val);
  };

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(`bg-[${e.target.value}]`);
  };

  return (
    <div className={`relative flex items-center gap-1.5 ${className}`}>
      {/* Color Preview Indicator */}
      <div 
        className={`w-4 h-4 rounded-full shadow-sm ring-1 ring-black/5 shrink-0 ${value}`} 
        style={isCustom ? { backgroundColor: customHex } : undefined}
      />

      {/* Select Dropdown */}
      <div className="relative flex-1 min-w-[80px]">
        <select
          value={isCustom ? 'custom' : value}
          onChange={handlePresetChange}
          className="w-full pl-2 pr-6 py-1 text-[10px] sm:text-xs border border-gray-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold focus:ring-1 focus:ring-brand-500 outline-none appearance-none cursor-pointer"
        >
          {PRESET_COLORS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
          <option value="custom">🎨 직접 선택</option>
        </select>
        <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Custom Color Input (Visible if 'custom' is selected or currently custom value) */}
      {(isCustom || value === 'custom') && (
        <div className="relative w-6 h-6 overflow-hidden rounded-md border border-gray-200 dark:border-slate-600 shrink-0">
           <input 
             type="color" 
             value={customHex}
             onChange={handleCustomHexChange}
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 cursor-pointer border-none"
             title="사용자 지정 색상 선택"
           />
        </div>
      )}
    </div>
  );
};