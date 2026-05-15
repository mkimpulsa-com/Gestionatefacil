import React from 'react';
import { cn } from '../../utils/cn';

export function Input({
  label,
  error,
  className,
  containerClassName,
  type = 'text',
  isTextarea = false,
  ...props
}) {
  const Component = isTextarea ? 'textarea' : 'input';

  return (
    <div className={cn('form-group', containerClassName)}>
      {label && <label className="form-label">{label}</label>}
      <Component
        type={!isTextarea ? type : undefined}
        className={cn(
          'form-input',
          error && 'border-danger focus:ring-danger',
          isTextarea && 'min-h-[100px] resize-y',
          className
        )}
        {...props}
      />
      {error && <span className="text-danger text-xs mt-1 animate-fade-in">{error}</span>}
    </div>
  );
}

export function Select({
  label,
  error,
  children,
  className,
  containerClassName,
  ...props
}) {
  return (
    <div className={cn('form-group', containerClassName)}>
      {label && <label className="form-label">{label}</label>}
      <select
        className={cn(
          'form-select',
          error && 'border-danger focus:ring-danger',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-danger text-xs mt-1 animate-fade-in">{error}</span>}
    </div>
  );
}
