import type { ComponentProps, ReactElement } from 'react';

import { cn } from '@/lib/utils';

/**
 * İçerikle aynı ölçüde yer tutucu. Dekoratiftir (`aria-hidden`); yükleme durumunu ekran
 * okuyucuya kapsayıcı bildirir (`aria-busy`).
 */
export const Skeleton = ({ className, ...props }: ComponentProps<'div'>): ReactElement => (
  <div
    data-slot='skeleton'
    aria-hidden='true'
    className={cn('animate-pulse rounded-md bg-bg-muted', className)}
    {...props}
  />
);
