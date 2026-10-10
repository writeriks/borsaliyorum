'use client';

import { HoverCard as HoverCardPrimitive } from 'radix-ui';
import type { ComponentProps, ReactElement } from 'react';

import { cn } from '@/lib/utils';

export const HoverCard = ({
  openDelay = 400,
  closeDelay = 150,
  ...props
}: ComponentProps<typeof HoverCardPrimitive.Root>): ReactElement => (
  <HoverCardPrimitive.Root openDelay={openDelay} closeDelay={closeDelay} {...props} />
);

export const HoverCardTrigger = HoverCardPrimitive.Trigger;

export const HoverCardContent = ({
  className,
  align = 'start',
  sideOffset = 8,
  ...props
}: ComponentProps<typeof HoverCardPrimitive.Content>): ReactElement => (
  <HoverCardPrimitive.Portal>
    <HoverCardPrimitive.Content
      data-slot='hover-card-content'
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-60 w-72 rounded-lg border border-border bg-bg-elevated p-4 text-fg shadow-md',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className
      )}
      {...props}
    />
  </HoverCardPrimitive.Portal>
);
