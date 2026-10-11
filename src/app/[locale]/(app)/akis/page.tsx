import { Newspaper } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/states/empty-state';
import { EmailVerificationNotice } from '@/features/auth/components/email-verification-notice';
import { PostCard } from '@/features/posts/components/post-card';
import { PostComposer } from '@/features/posts/components/post-composer';
import { getMyRecentPosts } from '@/features/posts/server/queries';
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
 * bağlı ve görüntüleyenin son gönderileri (beğeni + sahibine silme) listelenir.
 */
const FeedPage = async ({ params }: FeedPageProps): Promise<ReactElement> => {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  // Layout zaten korur; sayfa da kendi yetkisini kontrol eder (DAL ilkesi, cache'li tek çağrı)
  const viewer = await requireUser();
  const t = await getTranslations({ locale, namespace: 'feedPlaceholder' });
  const posts = await getMyRecentPosts();

  return (
    <div className='flex flex-col'>
      <h1 className='border-b border-border px-4 py-3 text-lg font-semibold text-fg'>
        {t('title')}
      </h1>
      <EmailVerificationNotice />
      <div className='border-b border-border p-3 sm:p-4'>
        <PostComposer viewerId={viewer.userId} />
      </div>
      {posts.length > 0 ? (
        <section aria-labelledby='my-posts-heading' data-testid='my-posts'>
          <h2 id='my-posts-heading' className='px-4 pt-4 pb-2 text-sm font-semibold text-fg-muted'>
            {t('mine')}
          </h2>
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </section>
      ) : (
        <EmptyState icon={Newspaper} message={t('body')} />
      )}
    </div>
  );
};

export default FeedPage;
