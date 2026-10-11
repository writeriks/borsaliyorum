import { Hash } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { stockHref, tagHref } from '@/components/rich-text';
import { EmptyState } from '@/components/states/empty-state';
import { Link } from '@/i18n/navigation';
import { logger } from '@/lib/logger';

import {
  type FollowedStock,
  getFollowedStocks,
  loadCachedTrendingTags,
  type TrendingTag,
} from '../server/aside';

const log = logger.child({ module: 'feed.aside' });

const cardClass = 'rounded-lg border border-border bg-bg-subtle';
const headingClass = 'px-4 pt-4 pb-2 text-md font-semibold text-fg';

export const TrendingTagsView = ({
  tags,
}: {
  tags: readonly TrendingTag[] | null;
}): ReactElement => {
  const t = useTranslations('feed.aside');
  if (tags === null) {
    return <p className='px-4 pb-4 text-sm text-fg-muted'>{t('trendingError')}</p>;
  }
  if (tags.length === 0) {
    return <EmptyState icon={Hash} message={t('trendingEmpty')} className='py-6' />;
  }
  return (
    <ol className='flex flex-col px-2 pb-2'>
      {tags.map(tag => (
        <li key={tag.slug}>
          <Link
            href={tagHref(tag.slug)}
            data-entity='hashtag'
            className='flex min-h-hit items-center justify-between gap-3 rounded-md px-2 text-sm hover:bg-bg-muted'
          >
            <span className='truncate font-medium text-accent'>{`#${tag.name}`}</span>
            <span className='shrink-0 text-xs text-fg-subtle tabular-nums'>
              {t('trendingCount', { count: tag.count })}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
};

export const FollowedStocksView = ({
  stocks,
}: {
  stocks: readonly FollowedStock[];
}): ReactElement | null => {
  const t = useTranslations('feed.aside');
  // "Veri varsa": takip edilen hisse yoksa bölüm hiç gösterilmez (boş kutu gürültüsü yok)
  if (stocks.length === 0) return null;
  return (
    <section
      aria-labelledby='followed-stocks-title'
      data-testid='followed-stocks'
      className={cardClass}
    >
      <h2 id='followed-stocks-title' className={headingClass}>
        {t('followedStocksTitle')}
      </h2>
      <ul className='flex flex-col px-2 pb-2'>
        {stocks.map(stock => (
          <li key={stock.ticker}>
            <Link
              href={stockHref(stock.ticker)}
              data-entity='cashtag'
              className='flex min-h-hit items-center justify-between gap-3 rounded-md px-2 text-sm hover:bg-bg-muted'
            >
              <span className='font-medium text-accent tabular-nums'>{`$${stock.ticker}`}</span>
              <span className='truncate text-xs text-fg-subtle'>{stock.companyName}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

const loadTrending = async (): Promise<TrendingTag[] | null> => {
  try {
    return await loadCachedTrendingTags();
  } catch (error) {
    // Sağ kolon ikincil: hata sayfayı bozmaz, satır içi kısa mesaj
    log.error('trending tags load failed', { err: error });
    return null;
  }
};

const loadFollowed = async (): Promise<FollowedStock[]> => {
  try {
    return await getFollowedStocks();
  } catch (error) {
    log.error('followed stocks load failed', { err: error });
    return [];
  }
};

type FeedAsideViewProps = {
  trending: readonly TrendingTag[] | null;
  followed: readonly FollowedStock[];
};

export const FeedAsideView = ({ trending, followed }: FeedAsideViewProps): ReactElement => {
  const t = useTranslations('feed.aside');
  return (
    <>
      <section
        aria-labelledby='trending-tags-title'
        data-testid='trending-tags'
        className={cardClass}
      >
        <h2 id='trending-tags-title' className={headingClass}>
          {t('trendingTitle')}
        </h2>
        <TrendingTagsView tags={trending} />
      </section>
      <FollowedStocksView stocks={followed} />
    </>
  );
};

/**
 * Sağ kolon içeriği (lg+; tasarım §7.3): gündem etiketleri (son 30 gün, 10 dk paylaşılan
 * önbellek) ve takip ettiğin hisseler (kişiye özel, tek index'li sorgu). İkisi paralel ve
 * **ilk HTML'de** hazır: `Suspense` ile sonradan gelseydi altındaki footer kayardı (CLS).
 * Başlıkta ölçüt yazılı; "yükselenler/fırsat" yok (SPK, design-system).
 */
export const FeedAside = async (): Promise<ReactElement> => {
  const [trending, followed] = await Promise.all([loadTrending(), loadFollowed()]);
  return <FeedAsideView trending={trending} followed={followed} />;
};
