import type { ReactElement } from 'react';

import { FeedList } from '@/features/feed/components/feed-list';
import { FeedLoadError } from '@/features/feed/components/feed-load-error';
import { FeedEmpty } from '@/features/feed/components/feed-states';
import type { FeedFollowSummary, FeedPage, FeedTab } from '@/features/feed/types';
import { getDiscoverPosts, getFeedPage, getFollowSummary } from '@/features/posts/server/feed';
import type { PostCardData } from '@/features/posts/types';
import { ErrorCode, type Result } from '@/lib/errors';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'feed.section' });

export type FeedSectionLoaders = {
  page: (tab: FeedTab) => Promise<Result<FeedPage>>;
  follows: () => Promise<FeedFollowSummary>;
  discover: () => Promise<PostCardData[]>;
};

const defaultLoaders: FeedSectionLoaders = {
  page: tab => getFeedPage({ tab }),
  follows: getFollowSummary,
  discover: getDiscoverPosts,
};

type Loaded =
  | { kind: 'error' }
  | { kind: 'empty'; follows: FeedFollowSummary; discover: PostCardData[] }
  | { kind: 'page'; page: FeedPage };

const load = async (tab: FeedTab, loaders: FeedSectionLoaders): Promise<Loaded> => {
  const result = await loaders.page(tab);
  if (!result.ok) {
    // Sayfa `requireUser` ile korunur; buraya düşen kod beklenmez
    if (result.error !== ErrorCode.UNAUTHENTICATED) {
      log.error('feed first page rejected', { error: result.error, tab });
    }
    return { kind: 'error' };
  }
  if (result.data.items.length > 0) return { kind: 'page', page: result.data };
  const follows = await loaders.follows();
  const followsNothing = follows.users === 0 && follows.stocks === 0;
  return { kind: 'empty', follows, discover: followsNothing ? await loaders.discover() : [] };
};

/**
 * Akışın ilk sayfası (async Server Component, `/akis`'te `Suspense` içinde: yavaşlarsa
 * composer ve sekmeler beklemez). Yükleme hatası satır içi gösterilir; sayfanın geri kalanı
 * çalışır. Boşsa takip özetine göre boş durum (kimseyi takip etmiyorsa keşfet önerisi).
 */
export const FeedSection = async ({
  tab,
  labelledBy,
  loaders = defaultLoaders,
}: {
  tab: FeedTab;
  labelledBy: string;
  loaders?: FeedSectionLoaders;
}): Promise<ReactElement> => {
  let loaded: Loaded;
  try {
    loaded = await load(tab, loaders);
  } catch (error) {
    log.error('feed first page failed', { err: error, tab });
    loaded = { kind: 'error' };
  }
  if (loaded.kind === 'error') return <FeedLoadError />;
  if (loaded.kind === 'empty') {
    return <FeedEmpty tab={tab} follows={loaded.follows} discover={loaded.discover} />;
  }
  return <FeedList key={tab} tab={tab} initialPage={loaded.page} labelledBy={labelledBy} />;
};
