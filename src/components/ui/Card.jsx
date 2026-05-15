import React from 'react';
import { cn } from '../../utils/cn';

export function Card({
  children,
  className,
  variant = 'glass',
  padding = 'md',
  ...props
}) {
  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-10',
  };

  return (
    <div
      className={cn(
        variant === 'glass' ? 'glass-panel' : 'glass-card',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
