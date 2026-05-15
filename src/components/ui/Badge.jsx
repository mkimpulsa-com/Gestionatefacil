import React from 'react';
import { cn } from '../../utils/cn';

export function Badge({
  children,
  variant = 'neutral',
  className,
  ...props
}) {
  const variants = {
    neutral: 'status-neutral',
    success: 'status-activo',
    warning: 'status-pendiente',
    danger: 'status-danger',
    info: 'status-inactivo', // Mapping to existing styles if possible or defining new ones
  };

  return (
    <span
      className={cn(
        'status-badge',
        variants[variant] || `status-${variant}`,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
