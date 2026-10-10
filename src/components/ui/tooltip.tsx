'use client';

import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ComponentProps, ReactElement } from 'react';

import { cn } from '@/lib/utils';

/** Uygulamada tek bir provider (Providers içinde); bileşenler yalnızca Tooltip kullanır. */
export const TooltipProvider = ({
  delayDuration = 300,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>): ReactElement => (
  <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />
);

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = ({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>): ReactElement => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      data-slot='tooltip-content'
      sideOffset={sideOffset}
      className={cn(
        'z-60 rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-xs text-fg shadow-md',
        'animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
);
