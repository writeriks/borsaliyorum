import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as NextNavigation from 'next/navigation';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostCardData } from '@/features/posts/types';
import { dispatchPostDeleted } from '@/lib/post-events';

import { MESSAGES, renderWithIntl } from '../../../../tests/utils/render';
import type { FeedPage } from '../types';

const push = vi.fn();
vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof NextNavigation>()),
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/akis',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/features/posts/server/actions', () => ({
  setPostLike: vi.fn(),
  deletePost: vi.fn(),
}));

const { FeedList } = await import('./feed-list');

const tr = MESSAGES.tr;

const post = (id: number, minute = id): PostCardData => ({
  id,
  author: { username: `yazar${id}`, displayName: `Yazar ${id}`, avatarUrl: null },
  createdAt: new Date(Date.UTC(2026, 9, 10, 12, minute)).toISOString(),
  body: { text: `gönderi metni ${id}`, entities: [] },
  stocks: {},
  sentiment: 'neutral',
  isSponsored: false,
  mediaUrl: null,
  linkPreview: { status: 'none' },
  counts: { likes: 0, comments: 0, reposts: 0 },
  viewer: { liked: false, isOwner: false },
});

const page = (
  items: PostCardData[],
  nextCursor: string | null,
  headCursor: string | null = null
): FeedPage => ({ items, nextCursor, headCursor });

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** IntersectionObserver taklidi: testte sentinel'i "görünür" yapar. */
let observerCallbacks: IntersectionObserverCallback[] = [];
class IntersectionObserverStub {
  constructor(callback: IntersectionObserverCallback) {
    observerCallbacks.push(callback);
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {
    observerCallbacks = [];
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
const intersect = (): void => {
  for (const callback of observerCallbacks) {
    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  }
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  observerCallbacks = [];
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  push.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const renderList = (props: Partial<Parameters<typeof FeedList>[0]> & { initialPage: FeedPage }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = (p: typeof props): ReactElement => (
    <QueryClientProvider client={client}>
      <h1 id='feed-heading'>{tr.feed.title}</h1>
      <FeedList tab='latest' labelledBy='feed-heading' {...p} />
    </QueryClientProvider>
  );
  const result = renderWithIntl(ui(props));
  return { ...result, rerenderList: (next: typeof props) => result.rerender(ui(next)), client };
};

const cardIds = (): string[] =>
  screen.getAllByTestId('post-card').map(card => card.getAttribute('data-post-id') ?? '');

describe('FeedList', () => {
  it('SSR ilk sayfası: role=feed, erişilebilir ad, konum öznitelikleri; istek atmaz', () => {
    renderList({ initialPage: page([post(3), post(2)], 'c1') });
    const feed = screen.getByRole('feed', { name: tr.feed.title });
    const cards = within(feed).getAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute('aria-posinset', '1');
    // Sonraki sayfa var: toplam bilinmiyor
    expect(cards[0]).toHaveAttribute('aria-setsize', '-1');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('"Daha fazla yükle" sonraki sayfayı imleçle ister; son sayfada buton yerine bitiş metni', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true, data: page([post(1)], null) }));
    renderList({ initialPage: page([post(3), post(2)], 'c1') });
    await userEvent.click(screen.getByRole('button', { name: tr.feed.loadMore }));
    await waitFor(() => expect(cardIds()).toEqual(['3', '2', '1']));
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/feed?tab=latest&cursor=c1');
    expect(screen.queryByRole('button', { name: tr.feed.loadMore })).toBeNull();
    expect(screen.getByTestId('feed-end')).toHaveTextContent(tr.feed.end);
    expect(screen.getAllByRole('article').at(-1)).toHaveAttribute('aria-setsize', '3');
  });

  it('sonsuz kaydırma: sentinel görünür olunca sonraki sayfa yüklenir (iskelet gösterilir)', async () => {
    let resolve: (value: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise(r => (resolve = r)));
    renderList({ initialPage: page([post(3)], 'c1') });
    act(() => intersect());
    expect(await screen.findByTestId('feed-loading-more')).toBeInTheDocument();
    expect(screen.getByRole('feed')).toHaveAttribute('aria-busy', 'true');
    await act(async () => resolve(json({ ok: true, data: page([post(2)], null) })));
    await waitFor(() => expect(cardIds()).toEqual(['3', '2']));
    expect(screen.queryByTestId('feed-loading-more')).toBeNull();
  });

  it('sonraki sayfa hatası satır içi; otomatik yükleme durur, "Tekrar dene" yeniden ister', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ ok: false, error: 'INTERNAL' }, 500))
      .mockResolvedValueOnce(json({ ok: true, data: page([post(2)], null) }));
    renderList({ initialPage: page([post(3)], 'c1') });
    act(() => intersect());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(tr.feed.loadMoreError);
    // İlk sayfa yerinde; hata tüm listeyi bozmaz
    expect(cardIds()).toEqual(['3']);
    expect(observerCallbacks).toHaveLength(0);
    await userEvent.click(within(alert).getByRole('button', { name: tr.common.retry }));
    await waitFor(() => expect(cardIds()).toEqual(['3', '2']));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('oturum düştüyse (401) girişe yönlendirir, hata bandı göstermez', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'UNAUTHENTICATED' }, 401));
    renderList({ initialPage: page([post(3)], 'c1') });
    await userEvent.click(screen.getByRole('button', { name: tr.feed.loadMore }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/giris?next=')));
    expect(screen.queryByText(tr.feed.loadMoreError)).toBeNull();
  });

  it('"N yeni gönderi": yoklama sayıyı gösterir; banda basınca ilk sayfa tazelenir', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock
      .mockResolvedValueOnce(json({ ok: true, data: { count: 2 } }))
      .mockResolvedValueOnce(
        json({ ok: true, data: page([post(5), post(4), post(3)], 'c2', 'h5') })
      );
    renderList({ initialPage: page([post(3)], 'c1', 'h3'), pollMs: 1000 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    const band = await screen.findByTestId('feed-new-posts');
    expect(band).toHaveTextContent('2 yeni gönderi');
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/feed/new?since=h3');

    await userEvent.click(band);
    await waitFor(() => expect(cardIds()).toEqual(['5', '4', '3']));
    expect(screen.queryByTestId('feed-new-posts')).toBeNull();
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe('/api/feed?tab=latest');
  });

  it('read-your-own-writes: sunucudan taze ilk sayfa gelince yeni kart başa eklenir', async () => {
    const { rerenderList } = renderList({ initialPage: page([post(3), post(2)], 'c1', 'h3') });
    rerenderList({ initialPage: page([post(9, 90), post(3), post(2)], 'c1', 'h9') });
    // React Query gözlemci bildirimi asenkron
    await waitFor(() => expect(cardIds()).toEqual(['9', '3', '2']));
  });

  it('silinen gönderi (POST_DELETED_EVENT) listeden hemen çıkar', async () => {
    renderList({ initialPage: page([post(3), post(2)], null) });
    act(() => dispatchPostDeleted(3));
    await waitFor(() => expect(cardIds()).toEqual(['2']));
  });
});
