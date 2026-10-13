'use client';

import React from 'react';
import { useNavigationProgress } from '@/hooks/useNavigationProgress';

interface NavigationProgressProps {
  color?: string;
  height?: number;
  showSpinner?: boolean;
  className?: string;
}

const NavigationProgress: React.FC<NavigationProgressProps> = ({
  color = '#3b82f6', // Blue color
  height = 3,
  showSpinner = false,
  className = '',
}) => {
  const { isNavigating, progress } = useNavigationProgress();

  if (!isNavigating) return null;

  return (
    <>
      {/* Progress Bar */}
      <div
        className={`fixed top-0 left-0 z-[9999] ${
          progress === 25 ? '' : 'transition-all duration-300 ease-out'
        } ${className}`}
        style={{
          height: `${height}px`,
          width: `${progress}%`,
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}40`,
          transitionProperty: 'width',
        }}
      />

      {/* Optional Spinner */}
      {showSpinner && (
        <div className='fixed top-4 right-4 z-[9998]'>
          <div
            className='animate-spin rounded-full border-2 border-t-transparent'
            style={{
              width: '18px',
              height: '18px',
              borderColor: `${color}30`,
              borderTopColor: color,
            }}
          />
        </div>
      )}
    </>
  );
};

export default NavigationProgress;
