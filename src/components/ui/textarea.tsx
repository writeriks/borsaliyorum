import type { ComponentProps, ReactElement } from 'react';

import { cn } from '@/lib/utils';

import { fieldClasses } from './input';

export const Textarea = ({ className, ...props }: ComponentProps<'textarea'>): ReactElement => (
  <textarea
    data-slot='textarea'
    className={cn(fieldClasses, 'min-h-24 py-3 sm:text-post', className)}
    {...props}
  />
);
