import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { type ReactElement, Suspense } from 'react';

import { EmailVerificationNotice } from '@/features/auth/components/email-verification-notice';
import { MyRecentPosts, RecentPostsSkeleton } from '@/features/posts/components/my-recent-posts';
import { PostComposer } from '@/features/posts/components/post-composer';
import { resolveLocale } from '@/i18n/page-params';
import { requireUser } from '@/lib/auth/session';

type FeedPageProps = { params: Promise<{ locale: string }> };

export const generateMetadata = async ({ params }: FeedPageProps): Promise<Metadata> => {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale });
  return { title: `${t('feedPlaceholder.title')} · ${t('metadata.title')}` };
};

/**
 * Akış yer tutucusu: gerçek akış (takip/son sekmeleri) S11'de. S10: composer gerçek `createPost`'a
 * bağlı ve görüntüleyenin son gönderileri (beğeni + sahibine silme) listelenir. Liste ayrı async
 * bileşende `Suspense` içinde: yavaşlarsa composer beklemez, hata verirse satır içi hata
 * gösterilir ve composer her koşulda render edilir.
 */
const FeedPage = async ({ params }: FeedPageProps): Promise<ReactElement> => {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  // Layout zaten korur; sayfa da kendi yetkisini kontrol eder (DAL ilkesi, cache'li tek çağrı)
  const viewer = await requireUser();
  const t = await getTranslations({ locale, namespace: 'feedPlaceholder' });

  return (
    <div className='flex flex-col'>
      <h1 className='border-b border-border px-4 py-3 text-lg font-semibold text-fg'>
        {t('title')}
      </h1>
      <EmailVerificationNotice />
      <div className='border-b border-border p-3 sm:p-4'>
        <PostComposer viewerId={viewer.userId} />
      </div>
      <Suspense fallback={<RecentPostsSkeleton />}>
        <MyRecentPosts />
      </Suspense>
    </div>
  );
};

export default FeedPage;
