'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactElement, useTransition } from 'react';

import { ErrorState } from '@/components/states/error-state';

/**
 * Liste yükleme hatası (satır içi). Tekrar dene sunucu bileşenlerini yeniden ister
 * (`router.refresh`); composer'daki taslak istemci durumu olduğu için korunur.
 */
export const RecentPostsError = (): ReactElement => {
  const t = useTranslations('feedPlaceholder');
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <ErrorState
      variant='inline'
      message={t('loadError')}
      onRetry={() => startTransition(() => router.refresh())}
    />
  );
};
