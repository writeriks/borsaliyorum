import type { ComponentProps, ReactElement } from 'react';

import { cn } from '@/lib/utils';

/** Kontrol sınırı `--border-strong` (≥3:1). Mobilde 16px: iOS odakta sayfayı zoomlamasın. */
export const fieldClasses = [
  'w-full min-w-0 rounded-md border border-border-strong bg-bg-subtle px-3 text-fg',
  'text-md sm:text-sm placeholder:text-fg-subtle',
  'transition-colors duration-(--duration-fast)',
  'disabled:cursor-not-allowed disabled:opacity-60',
  'aria-invalid:border-danger',
];

export const Input = ({
  className,
  type = 'text',
  ...props
}: ComponentProps<'input'>): ReactElement => (
  <input
    data-slot='input'
    type={type}
    className={cn(fieldClasses, 'min-h-hit py-2', className)}
    {...props}
  />
);
