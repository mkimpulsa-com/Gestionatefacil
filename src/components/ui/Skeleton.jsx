import React from 'react';
import './Skeleton.css';

export const Skeleton = ({ width, height, borderRadius, className = '' }) => {
  const style = {
    width: width || '100%',
    height: height || '20px',
    borderRadius: borderRadius || 'var(--radius-md, 8px)',
  };

  return <div className={`skeleton-loader ${className}`} style={style}></div>;
};

export const SkeletonCard = () => (
  <div className="skeleton-card-wrapper">
    <Skeleton height="100px" borderRadius="16px" />
  </div>
);

export const SkeletonRow = ({ columns = 5 }) => (
  <div className="skeleton-row-wrapper">
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton key={i} height="20px" borderRadius="4px" />
    ))}
  </div>
);
