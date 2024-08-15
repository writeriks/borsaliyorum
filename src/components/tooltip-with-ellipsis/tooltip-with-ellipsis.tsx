import React, { useRef, useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TooltipWithEllipsisProps {
  tooltipText: string;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  maxWidth?: string;
  className?: string;
  children?: React.ReactNode;
}

const TooltipWithEllipsis: React.FC<TooltipWithEllipsisProps> = ({
  tooltipText,
  tooltipSide = 'top',
  maxWidth = '150px',
  className,
  children,
}) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowed, setIsOverflowed] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (element) {
      setIsOverflowed(element.scrollWidth > element.clientWidth);
    }
  }, [tooltipText]);

  return (
    <TooltipProvider>
      {children ? (
        <Tooltip>
          <TooltipTrigger asChild>{children}</TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <p
              ref={textRef}
              style={{ maxWidth }}
              className={cn('truncate overflow-hidden text-ellipsis whitespace-nowrap', className)}
            >
              {tooltipText}
            </p>
          </TooltipTrigger>
          {isOverflowed && (
            <TooltipContent side={tooltipSide}>
              <p>{tooltipText}</p>
            </TooltipContent>
          )}
        </Tooltip>
      )}
    </TooltipProvider>
  );
};

export default TooltipWithEllipsis;
