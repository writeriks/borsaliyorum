import { Newspaper } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/states/empty-state';
import { logger } from '@/lib/logger';

import { getMyRecentPosts } from '../server/queries';
import type { PostCardData } from '../types';

import { PostCard } from './post-card';
import { PostCardSkeleton } from './post-card-states';
import { RecentPostsError } from './recent-posts-error';

const log = logger.child({ module: 'posts.my-recent-posts' });

/** Liste görünümü (senkron; çeviri `useTranslations` ile, test edilebilir). */
export const RecentPostsView = ({ posts }: { posts: readonly PostCardData[] }): ReactElement => {
  const t = useTranslations('feedPlaceholder');
  if (posts.length === 0) return <EmptyState icon={Newspaper} message={t('body')} />;
  return (
    <section aria-labelledby='my-posts-heading' data-testid='my-posts'>
      <h2 id='my-posts-heading' className='px-4 pt-4 pb-2 text-sm font-semibold text-fg-muted'>
        {t('mine')}
      </h2>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </section>
  );
};

/** Suspense iskeleti: kartla aynı ölçüde (CLS yok). İçerik yüklemesi, auth değil. */
export const RecentPostsSkeleton = (): ReactElement => (
  <div data-testid='my-posts-skeleton'>
    <PostCardSkeleton />
    <PostCardSkeleton />
  </div>
);

/**
 * Görüntüleyenin son gönderileri (async Server Component; `/akis`'te `Suspense` içinde). Liste
 * yüklenemezse hata **satır içi** gösterilir: sayfanın geri kalanı (composer) çalışmaya devam
 * eder; tüm sayfa error boundary'ye düşmez.
 */
export const MyRecentPosts = async ({
  load = getMyRecentPosts,
}: {
  /** Test için veri kaynağı yerine geçer. */
  load?: () => Promise<PostCardData[]>;
}): Promise<ReactElement> => {
  let posts: PostCardData[];
  try {
    posts = await load();
  } catch (error) {
    log.error('recent posts load failed', { err: error });
    return <RecentPostsError />;
  }
  return <RecentPostsView posts={posts} />;
};
