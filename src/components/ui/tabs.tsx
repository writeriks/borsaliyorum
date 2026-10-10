'use client';

import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps, ReactElement } from 'react';

import { cn } from '@/lib/utils';

export const Tabs = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>): ReactElement => (
  <TabsPrimitive.Root data-slot='tabs' className={cn('flex flex-col', className)} {...props} />
);

export const TabsList = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>): ReactElement => (
  <TabsPrimitive.List
    data-slot='tabs-list'
    className={cn('flex items-stretch border-b border-border', className)}
    {...props}
  />
);

export const TabsTrigger = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>): ReactElement => (
  <TabsPrimitive.Trigger
    data-slot='tabs-trigger'
    className={cn(
      'relative inline-flex min-h-hit flex-1 items-center justify-center px-4 text-sm font-medium text-fg-muted',
      'transition-colors duration-(--duration-fast) hover:text-fg',
      'data-[state=active]:text-fg data-[state=active]:after:absolute data-[state=active]:after:inset-x-4',
      'data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 data-[state=active]:after:rounded-full data-[state=active]:after:bg-accent',
      'disabled:pointer-events-none disabled:opacity-60',
      className
    )}
    {...props}
  />
);

export const TabsContent = ({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>): ReactElement => (
  <TabsPrimitive.Content data-slot='tabs-content' className={cn('flex-1', className)} {...props} />
);
