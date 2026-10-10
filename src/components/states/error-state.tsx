'use client';

import { CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactElement, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ErrorStateProps = {
  /** Ne oldu (+ ne yapabilir). Teknik ayrıntı yok: ErrorCode → i18n mesajı. */
  message: string;
  /**
   * Tekrar deneme. Promise dönerse bitene kadar buton devre dışı + spinner.
   * Hatayı çağıran ele alır (yeni ErrorState/toast); burada yutulmaz.
   */
  onRetry?: () => void | Promise<void>;
  /** `block`: tüm alan; `inline`: liste sonunda satır içi (Partial durumu) */
  variant?: 'block' | 'inline';
  className?: string;
};

export const ErrorState = ({
  message,
  onRetry,
  variant = 'block',
  className,
}: ErrorStateProps): ReactElement => {
  const t = useTranslations('common');
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async (): Promise<void> => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const inline = variant === 'inline';

  return (
    <div
      role='alert'
      data-slot='error-state'
      className={cn(
        inline
          ? 'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-sm'
          : 'flex flex-col items-center gap-3 px-4 py-12 text-center',
        className
      )}
    >
      {inline ? null : (
        <CircleAlert aria-hidden='true' className='size-8 text-danger' strokeWidth={1.75} />
      )}
      <p className={cn('text-fg-muted', inline ? 'text-sm' : 'max-w-sm text-sm')}>{message}</p>
      {onRetry ? (
        <Button
          variant={inline ? 'ghost' : 'outline'}
          loading={retrying}
          onClick={() => void handleRetry()}
        >
          {t('retry')}
        </Button>
      ) : null}
    </div>
  );
};
