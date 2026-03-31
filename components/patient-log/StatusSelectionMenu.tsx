
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Syringe, Hand, Zap, ArrowUpFromLine, Droplet, Atom, Dumbbell } from 'lucide-react';
import { PatientVisit } from '../../types';
import { ContextMenu } from '../common/ContextMenu';

interface StatusSelectionMenuProps {
  visit?: PatientVisit;
  position: { x: number; y: number };
  onClose: () => void;
  onToggle: (key: keyof PatientVisit) => void;
  title: string;
}

export const StatusSelectionMenu: React.FC<StatusSelectionMenuProps> = ({
  visit,
  position,
  onClose,
  onToggle,
  title
}) => {
  const statusOptions = useMemo(() => [
    { key: 'is_injection', label: '주사 (Injection)', icon: Syringe, color: 'text-red-500' },
    { key: 'is_fluid', label: '수액 (Fluid)', icon: Droplet, color: 'text-cyan-500' },
    { key: 'is_manual', label: '도수 (Manual)', icon: Hand, color: 'text-violet-500' },
    { key: 'is_eswt', label: '충격파 (ESWT)', icon: Zap, color: 'text-blue-500' },
    { key: 'is_traction', label: '견인 (Traction)', icon: ArrowUpFromLine, color: 'text-orange-500' },
    { key: 'is_ion', label: '이온 (Ion)', icon: Atom, color: 'text-emerald-500' },
    { key: 'is_exercise', label: '운동 (Exercise)', icon: Dumbbell, color: 'text-lime-500' },
  ], []);

  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const initialIndex = useMemo(() => {
    const activeIdx = statusOptions.findIndex((opt) => visit ? !!visit[opt.key as keyof PatientVisit] : false);
    return activeIdx >= 0 ? activeIdx : 0;
  }, [statusOptions, visit]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    buttonRefs.current[activeIndex]?.focus();
  }, [activeIndex]);

  const toggleSelection = useCallback((index: number) => {
    const option = statusOptions[index];
    if (!option) return;
    onToggle(option.key as keyof PatientVisit);
  }, [statusOptions, onToggle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) => (prev + 1) % statusOptions.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) => (prev - 1 + statusOptions.length) % statusOptions.length);
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        toggleSelection(activeIndex);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const activeOption = statusOptions[activeIndex];
        const isAlreadySelected = activeOption ? !!visit?.[activeOption.key as keyof PatientVisit] : false;
        if (!isAlreadySelected) {
          toggleSelection(activeIndex);
        }
        onClose();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeIndex, onClose, statusOptions, toggleSelection, visit]);

  return (
    <ContextMenu
      title={title}
      position={position}
      onClose={onClose}
    >
      {statusOptions.map((opt, idx) => {
        const isActive = visit ? !!visit[opt.key as keyof PatientVisit] : false;
        const isFocusedOption = idx === activeIndex;
        return (
          <button
            key={opt.key}
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            onClick={() => {
              setActiveIndex(idx);
              toggleSelection(idx);
            }}
            onTouchStart={() => setActiveIndex(idx)}
            className={`flex items-center justify-between p-2 rounded-lg transition-colors text-xs font-bold w-full ${isActive
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              } ${isFocusedOption ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-slate-800' : ''}`}
          >
            <div className="flex items-center gap-2">
              <opt.icon className={`w-4 h-4 ${isActive ? opt.color : 'text-gray-400'}`} />
              <span>{opt.label}</span>
            </div>
            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
          </button>
        );
      })}
    </ContextMenu>
  );
};
