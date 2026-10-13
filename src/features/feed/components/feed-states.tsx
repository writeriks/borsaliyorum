import { Compass, Newspaper, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/features/posts/components/post-card';
import { PostCardSkeleton } from '@/features/posts/components/post-card-states';
import type { PostCardData } from '@/features/posts/types';
import { Link } from '@/i18n/navigation';

import type { FeedFollowSummary, FeedTab } from '../types';

import { feedTabHref } from './feed-tabs';

/** İlk sayfa yüklenirken: kartlarla aynı ölçüde (CLS yok). İçerik yüklemesi, auth değil. */
export const FeedSkeleton = ({ count = 3 }: { count?: number }): ReactElement => (
  <div data-testid='feed-skeleton'>
    {Array.from({ length: count }, (_, index) => (
      <PostCardSkeleton key={index} />
    ))}
  </div>
);

type FeedEmptyProps = {
  tab: FeedTab;
  follows: FeedFollowSummary;
  /** Kimseyi takip etmeyen görüntüleyene keşfet önerisi: görünür son gönderiler. */
  discover: readonly PostCardData[];
};

/**
 * Boş akış (design-system: ikon + tek cümle + tek aksiyon).
 * - Kimseyi/hiçbir hisseyi takip etmiyor → açıklama + altında "Keşfet: son gönderiler"
 *   (yazarlarını ve hisselerini oradan bulur; plan: boş akış son gönderilere yönlendirir).
 * - Takip ediyor ama "En yeni" boş → ilk gönderiyi yazmaya çağrı (composer hemen üstte).
 * - "Popüler" boş → "En yeni"ye geçiş.
 */
export const FeedEmpty = ({ tab, follows, discover }: FeedEmptyProps): ReactElement => {
  const t = useTranslations('feed.empty');
  const followsNothing = follows.users === 0 && follows.stocks === 0;

  if (followsNothing) {
    return (
      <div data-testid='feed-empty' data-reason='no-follows'>
        <EmptyState icon={Users} message={t('noFollows')} />
        {discover.length > 0 ? (
          <section aria-labelledby='feed-discover-title' data-testid='feed-discover'>
            <h2
              id='feed-discover-title'
              className='flex items-center gap-2 border-y border-border px-4 py-3 text-sm font-semibold text-fg-muted'
            >
              <Compass aria-hidden='true' className='size-4' />
              {t('discoverTitle')}
            </h2>
            {discover.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </section>
        ) : null}
      </div>
    );
  }

  if (tab === 'popular') {
    return (
      <div data-testid='feed-empty' data-reason='popular'>
        <EmptyState
          icon={Newspaper}
          message={t('popular')}
          action={
            <Button asChild variant='outline'>
              <Link href={feedTabHref('latest')}>{t('toLatest')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div data-testid='feed-empty' data-reason='no-posts'>
      <EmptyState icon={Newspaper} message={t('noPosts')} />
    </div>
  );
};
