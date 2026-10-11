'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactElement, startTransition, useEffect } from 'react';

import { ErrorState } from '@/components/states/error-state';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'error-boundary' });

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * `[locale]` altındaki sayfa ve layout'ların (ör. `(app)` kabuğu) beklenmeyen hataları. Locale
 * layout'u (sağlayıcılar, i18n) ayakta kalır. Teknik ayrıntı gösterilmez; yalnızca sunucu
 * `digest`'i loglanır (mesaj kişisel veri içerebilir). Tekrar dene sunucu bileşenlerini yeniden
 * ister, sonra sınırı sıfırlar. Anonim UI ("Giriş yap") gösterilmez (auth-session).
 */
const ErrorPage = ({ error, reset }: ErrorPageProps): ReactElement => {
  const t = useTranslations('errorPage');
  const router = useRouter();

  useEffect(() => {
    log.error('route error boundary', { digest: error.digest });
  }, [error.digest]);

  return (
    <main className='mx-auto flex max-w-2xl flex-col px-4 py-16' data-testid='route-error'>
      <ErrorState
        message={t('message')}
        onRetry={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
      />
    </main>
  );
};

export default ErrorPage;
