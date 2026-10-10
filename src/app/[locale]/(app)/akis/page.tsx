import { Newspaper } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/states/empty-state';
import { EmailVerificationNotice } from '@/features/auth/components/email-verification-notice';
import { resolveLocale } from '@/i18n/page-params';
import { requireUser } from '@/lib/auth/session';

type FeedPageProps = { params: Promise<{ locale: string }> };

export const generateMetadata = async ({ params }: FeedPageProps): Promise<Metadata> => {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale });
  return { title: `${t('feedPlaceholder.title')} · ${t('metadata.title')}` };
};

/** Akış yer tutucusu: gerçek akış S11'de. Oturum korumasını ve doğrulama bandını taşır. */
const FeedPage = async ({ params }: FeedPageProps): Promise<ReactElement> => {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  // Layout zaten korur; sayfa da kendi yetkisini kontrol eder (DAL ilkesi, cache'li tek çağrı)
  await requireUser();
  const t = await getTranslations({ locale, namespace: 'feedPlaceholder' });

  return (
    <div className='flex flex-col'>
      <h1 className='border-b border-border px-4 py-3 text-lg font-semibold text-fg'>
        {t('title')}
      </h1>
      <EmailVerificationNotice />
      <EmptyState icon={Newspaper} message={t('body')} />
    </div>
  );
};

export default FeedPage;
