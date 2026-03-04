
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action, style }) => {
  return (
    <div 
      className={`
      bg-white dark:bg-neutral-900
      rounded-xl 
      border border-neutral-200 dark:border-neutral-800
      shadow-sm
      overflow-hidden 
      transition-all duration-200 ease-out
      hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700
      hover:-translate-y-0.5
      group
      ${className}
    `}
      style={style}
    >
      {(title || action) && (
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          {title && <h3 className="font-semibold text-neutral-900 dark:text-white tracking-tight">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6 relative">
        {children}
      </div>
    </div>
  );
};
