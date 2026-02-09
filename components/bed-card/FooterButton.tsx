
import React from 'react';

interface FooterButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  title?: string;
}

export const FooterButton: React.FC<FooterButtonProps> = ({ 
  onClick, 
  disabled, 
  className, 
  children, 
  title 
}) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm ${className} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    title={title}
  >
    {children}
  </button>
);
