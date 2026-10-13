import { screen, within } from '@testing-library/react';
import type * as NextNavigation from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

import type { PostCardData } from '@/features/posts/types';
import { ok } from '@/lib/errors';

import { MESSAGES, renderWithIntl } from '../../../../tests/utils/render';

vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof NextNavigation>()),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/akis',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/features/posts/server/actions', () => ({ setPostLike: vi.fn(), deletePost: vi.fn() }));
// Sunucu modülleri DOM'da yüklenmesin: bileşenler yalnızca saf görünümleriyle test edilir
vi.mock('@/features/posts/server/feed', () => ({
  getFeedPage: vi.fn(),
  getFollowSummary: vi.fn(),
  getDiscoverPosts: vi.fn(),
}));
vi.mock('../server/aside', () => ({ getFollowedStocks: vi.fn(), loadCachedTrendingTags: vi.fn() }));
const logError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/logger', () => ({
  logger: { child: () => ({ error: logError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() }) },
}));

const { FeedEmpty, FeedSkeleton } = await import('./feed-states');
const { FeedTabs } = await import('./feed-tabs');
const { FeedAsideView } = await import('./feed-aside');
const { FeedSection } = await import('../../../app/[locale]/(app)/akis/feed-section');

const tr = MESSAGES.tr;

const post = (id: number): PostCardData => ({
  id,
  author: { username: `yazar${id}`, displayName: `Yazar ${id}`, avatarUrl: null },
  createdAt: '2026-10-10T12:00:00.000Z',
  body: { text: `gönderi ${id}`, entities: [] },
  stocks: {},
  sentiment: 'neutral',
  isSponsored: false,
  mediaUrl: null,
  linkPreview: { status: 'none' },
  counts: { likes: 0, comments: 0, reposts: 0 },
  viewer: { liked: false, isOwner: false },
});

describe('FeedEmpty', () => {
  it('kimseyi takip etmiyor: açıklama + keşfet son gönderiler', () => {
    renderWithIntl(
      <FeedEmpty tab='latest' follows={{ users: 0, stocks: 0 }} discover={[post(1), post(2)]} />
    );
    expect(screen.getByText(tr.feed.empty.noFollows)).toBeInTheDocument();
    const discover = screen.getByRole('region', { name: tr.feed.empty.discoverTitle });
    expect(within(discover).getAllByTestId('post-card')).toHaveLength(2);
  });

  it('takip ediyor ama gönderi yok: ilk gönderi çağrısı, keşfet yok', () => {
    renderWithIntl(<FeedEmpty tab='latest' follows={{ users: 1, stocks: 0 }} discover={[]} />);
    expect(screen.getByText(tr.feed.empty.noPosts)).toBeInTheDocument();
    expect(screen.queryByTestId('feed-discover')).toBeNull();
  });

  it('Popüler boş: En yeniye geçiş linki', () => {
    renderWithIntl(<FeedEmpty tab='popular' follows={{ users: 0, stocks: 2 }} discover={[]} />);
    expect(screen.getByText(tr.feed.empty.popular)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr.feed.empty.toLatest })).toHaveAttribute(
      'href',
      '/akis'
    );
  });

  it('iskelet içerik yüklemesi olarak işaretli (auth iskeleti değil)', () => {
    renderWithIntl(<FeedSkeleton />);
    for (const skeleton of screen.getAllByTestId('post-card-skeleton')) {
      expect(skeleton).toHaveAttribute('data-skeleton', 'content');
    }
  });
});

describe('FeedTabs', () => {
  it('aktif sekme aria-current; Popüler ?sekme=populer', () => {
    renderWithIntl(<FeedTabs active='popular' />);
    const nav = screen.getByRole('navigation', { name: tr.feed.tabs.label });
    const latest = within(nav).getByRole('link', { name: tr.feed.tabs.latest });
    const popular = within(nav).getByRole('link', { name: tr.feed.tabs.popular });
    expect(latest).toHaveAttribute('href', '/akis');
    expect(latest).not.toHaveAttribute('aria-current');
    expect(popular).toHaveAttribute('href', '/akis?sekme=populer');
    expect(popular).toHaveAttribute('aria-current', 'page');
  });
});

describe('FeedSection', () => {
  const loaders = {
    page: vi.fn(),
    follows: vi.fn(async () => ({ users: 0, stocks: 0 })),
    discover: vi.fn(async () => [post(7)]),
  };

  it('ilk sayfa hatası: satır içi alert + tekrar dene; loglanır', async () => {
    loaders.page.mockRejectedValueOnce(new Error('db down'));
    renderWithIntl(await FeedSection({ tab: 'latest', labelledBy: 'h', loaders }));
    expect(screen.getByRole('alert')).toHaveTextContent(tr.feed.loadError);
    expect(screen.getByRole('button', { name: tr.common.retry })).toBeInTheDocument();
    expect(logError).toHaveBeenCalled();
  });

  it('boş sayfa + takip yok → keşfet önerisi yüklenir', async () => {
    loaders.page.mockResolvedValueOnce(ok({ items: [], nextCursor: null, headCursor: null }));
    renderWithIntl(await FeedSection({ tab: 'latest', labelledBy: 'h', loaders }));
    expect(screen.getByTestId('feed-empty')).toHaveAttribute('data-reason', 'no-follows');
    expect(loaders.discover).toHaveBeenCalled();
  });
});

describe('FeedAsideView', () => {
  it('gündem etiketleri ölçütlü başlıkla; takip edilen hisseler linkli', () => {
    renderWithIntl(
      <FeedAsideView
        trending={[{ slug: 'bist100', name: 'BIST100', count: 3 }]}
        followed={[{ ticker: 'THYAO', companyName: 'Türk Hava Yolları A.O.' }]}
      />
    );
    const trending = screen.getByRole('region', { name: tr.feed.aside.trendingTitle });
    expect(within(trending).getByRole('link', { name: /#BIST100/ })).toHaveAttribute(
      'href',
      '/etiket/bist100'
    );
    const followed = screen.getByRole('region', { name: tr.feed.aside.followedStocksTitle });
    expect(within(followed).getByRole('link', { name: /\$THYAO/ })).toHaveAttribute(
      'href',
      '/hisse/THYAO'
    );
  });

  it('gündem hatası satır içi; takip edilen hisse yoksa bölüm yok; boş gündem boş durum', () => {
    const { rerender } = renderWithIntl(<FeedAsideView trending={null} followed={[]} />);
    expect(screen.getByText(tr.feed.aside.trendingError)).toBeInTheDocument();
    expect(screen.queryByTestId('followed-stocks')).toBeNull();
    rerender(<FeedAsideView trending={[]} followed={[]} />);
    expect(screen.getByText(tr.feed.aside.trendingEmpty)).toBeInTheDocument();
  });
});
