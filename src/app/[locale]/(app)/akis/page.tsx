import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { type ReactElement, Suspense } from 'react';

import { EmailVerificationNotice } from '@/features/auth/components/email-verification-notice';
import { FeedTabs } from '@/features/feed/components/feed-tabs';
import { FeedSkeleton } from '@/features/feed/components/feed-states';
import { tabFromSearchParam } from '@/features/feed/schemas';
import { FEED_TAB_PARAM } from '@/features/feed/types';
import { PostComposer } from '@/features/posts/components/post-composer';
import { type AuthPageProps, resolveLocale } from '@/i18n/page-params';
import { requireUser } from '@/lib/auth/session';

import { FeedSection } from './feed-section';

export const generateMetadata = async ({ params }: AuthPageProps): Promise<Metadata> => {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale });
  return { title: `${t('feed.title')} · ${t('metadata.title')}` };
};

const HEADING_ID = 'feed-heading';

/**
 * Akış (S11): sekmeler ("En yeni" / "Popüler", `?sekme=populer`), composer ve ilk sayfa SSR;
 * sonraki sayfalar istemcide (`FeedList`). Liste ayrı async bileşende `Suspense` içinde: yavaşlarsa
 * composer beklemez, hata verirse satır içi hata. Yatırım uyarısı composer'da (kısa metin) ve
 * sağ kolon/footer'da (tam metin linki).
 */
const FeedPage = async ({ params, searchParams }: AuthPageProps): Promise<ReactElement> => {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  // Layout zaten korur; sayfa da kendi yetkisini kontrol eder (DAL ilkesi, cache'li tek çağrı)
  const viewer = await requireUser();
  const tab = tabFromSearchParam((await searchParams)[FEED_TAB_PARAM]);
  const t = await getTranslations({ locale, namespace: 'feed' });

  return (
    <div className='flex flex-col'>
      <h1 id={HEADING_ID} className='px-4 pt-3 pb-2 text-lg font-semibold text-fg'>
        {t('title')}
      </h1>
      <FeedTabs active={tab} />
      <EmailVerificationNotice />
      <div className='border-b border-border p-3 sm:p-4'>
        <PostComposer viewerId={viewer.userId} />
      </div>
      {tab === 'popular' ? (
        <p className='border-b border-border px-4 py-2 text-xs text-fg-subtle'>
          {t('popularHint')}
        </p>
      ) : null}
      <Suspense key={tab} fallback={<FeedSkeleton />}>
        <FeedSection tab={tab} labelledBy={HEADING_ID} />
      </Suspense>
    </div>
  );
};

export default FeedPage;
