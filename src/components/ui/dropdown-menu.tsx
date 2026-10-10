'use client';

import { Check } from 'lucide-react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import type { ComponentProps, ReactElement } from 'react';

import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export const DropdownMenuContent = ({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>): ReactElement => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      data-slot='dropdown-menu-content'
      sideOffset={sideOffset}
      className={cn(
        'z-60 min-w-44 overflow-hidden rounded-lg border border-border bg-bg-elevated p-1 text-fg shadow-md',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
);

const itemClasses =
  'relative flex min-h-hit cursor-default items-center gap-2 rounded-md px-3 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-60 data-[highlighted]:bg-bg-muted [&_svg]:size-4 [&_svg]:shrink-0';

export const DropdownMenuItem = ({
  className,
  variant = 'default',
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  variant?: 'default' | 'danger';
}): ReactElement => (
  <DropdownMenuPrimitive.Item
    data-slot='dropdown-menu-item'
    className={cn(itemClasses, variant === 'danger' && 'text-danger', className)}
    {...props}
  />
);

export const DropdownMenuRadioItem = ({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>): ReactElement => (
  <DropdownMenuPrimitive.RadioItem
    data-slot='dropdown-menu-radio-item'
    className={cn(itemClasses, 'pr-9', className)}
    {...props}
  >
    {children}
    <span className='absolute right-3 inline-flex items-center'>
      <DropdownMenuPrimitive.ItemIndicator>
        <Check aria-hidden='true' />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
  </DropdownMenuPrimitive.RadioItem>
);

export const DropdownMenuLabel = ({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label>): ReactElement => (
  <DropdownMenuPrimitive.Label
    data-slot='dropdown-menu-label'
    className={cn('px-3 py-2 text-xs font-medium text-fg-subtle', className)}
    {...props}
  />
);

export const DropdownMenuSeparator = ({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>): ReactElement => (
  <DropdownMenuPrimitive.Separator
    data-slot='dropdown-menu-separator'
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
);
