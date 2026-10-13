'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactElement, useTransition } from 'react';

import { ErrorState } from '@/components/states/error-state';

/**
 * İlk sayfa yüklenemedi (satır içi; sayfanın geri kalanı ve composer çalışır). Tekrar dene
 * sunucu bileşenlerini yeniden ister; composer taslağı istemci durumu olduğu için korunur.
 */
export const FeedLoadError = (): ReactElement => {
  const t = useTranslations('feed');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <ErrorState
      message={t('loadError')}
      onRetry={() => startTransition(() => router.refresh())}
      className={pending ? 'opacity-60' : undefined}
    />
  );
};
