import type { LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type EmptyStateProps = {
  /** 32px Lucide ikonu (dekoratif) */
  icon: LucideIcon;
  /** Tek cümle: ne yok + ne yapılabilir ("Takip ettiğin hisse yok. Keşfet'e göz at.") */
  message: string;
  /** Tek bir sonraki aksiyon (ör. Button asChild + Link) */
  action?: ReactNode;
  className?: string;
};

export const EmptyState = ({
  icon: Icon,
  message,
  action,
  className,
}: EmptyStateProps): ReactElement => (
  <div
    data-slot='empty-state'
    className={cn('flex flex-col items-center gap-3 px-4 py-12 text-center', className)}
  >
    <Icon aria-hidden='true' className='size-8 text-fg-subtle' strokeWidth={1.75} />
    <p className='max-w-sm text-sm text-fg-muted'>{message}</p>
    {action ? <div className='mt-1'>{action}</div> : null}
  </div>
);
