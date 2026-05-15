import React from 'react';
import { cn } from '../../utils/cn';

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon: Icon,
  iconPosition = 'left',
  disabled,
  ...props
}) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    icon: 'btn-icon',
  };

  const sizes = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  };

  const isIconOnly = variant === 'icon';

  return (
    <button
      disabled={isLoading || disabled}
      className={cn(
        'flex-center gap-2 transition-all duration-200 active:scale-95',
        variants[variant],
        !isIconOnly && sizes[size],
        isLoading && 'opacity-70 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <div className="btn-loader animate-spin" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && (typeof Icon === 'function' ? <Icon size={18} /> : Icon)}
          {children}
          {Icon && iconPosition === 'right' && (typeof Icon === 'function' ? <Icon size={18} /> : Icon)}
        </>
      )}
    </button>
  );
}
