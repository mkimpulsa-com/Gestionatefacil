import React from 'react';
import { cn } from '../../utils/cn';

export function Table({ children, className, ...props }) {
  return (
    <div className="table-responsive">
      <table className={cn('inv-table', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children, ...props }) {
  return <thead {...props}>{children}</thead>;
}

export function Tbody({ children, ...props }) {
  return <tbody {...props}>{children}</tbody>;
}

export function Tr({ children, className, ...props }) {
  return (
    <tr className={cn('table-row-hover', className)} {...props}>
      {children}
    </tr>
  );
}

export function Th({ children, className, ...props }) {
  return <th className={className} {...props}>{children}</th>;
}

export function Td({ children, className, label, ...props }) {
  return (
    <td data-label={label} className={className} {...props}>
      {children}
    </td>
  );
}
