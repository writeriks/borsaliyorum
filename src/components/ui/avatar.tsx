'use client';

import { Avatar as AvatarPrimitive } from 'radix-ui';
import type { ComponentProps, ReactElement } from 'react';

import { cn } from '@/lib/utils';

export const Avatar = ({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Root>): ReactElement => (
  <AvatarPrimitive.Root
    data-slot='avatar'
    className={cn('relative flex size-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
);

export const AvatarImage = ({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Image>): ReactElement => (
  <AvatarPrimitive.Image
    data-slot='avatar-image'
    className={cn('aspect-square size-full object-cover', className)}
    {...props}
  />
);

export const AvatarFallback = ({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Fallback>): ReactElement => (
  <AvatarPrimitive.Fallback
    data-slot='avatar-fallback'
    className={cn(
      'flex size-full items-center justify-center rounded-full bg-bg-muted text-sm font-semibold text-fg-muted',
      className
    )}
    {...props}
  />
);
