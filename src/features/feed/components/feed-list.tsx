'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';

import { ErrorState } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/features/posts/components/post-card';
import { PostCardSkeleton } from '@/features/posts/components/post-card-states';
import { useActionResult } from '@/lib/client/action-result';
import { ErrorCode, fail } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { onPostDeleted } from '@/lib/post-events';

import { FeedRequestError, fetchFeedPage, fetchNewPostCount } from '../client/api';
import {
  type FeedData,
  feedQueryKey,
  flattenUnique,
  initialFeedData,
  keepFirstPage,
  mergeFreshFirstPage,
  removePostFromPages,
} from '../client/pages';
import { type FeedPage, type FeedTab, NEW_POSTS_COUNT_CAP } from '../types';

const log = logger.child({ module: 'feed.list' });

/** "N yeni gönderi" yoklama aralığı (yalnızca sekme görünürken). */
export const NEW_POSTS_POLL_MS = 60_000;
/** Sentinel görünür alana bu kadar yaklaşınca sonraki sayfa istenir (kullanıcı beklemesin). */
const PREFETCH_MARGIN = '800px 0px';

type FeedListProps = {
  tab: FeedTab;
  /** Sunucuda render edilen ilk sayfa (SSR; `useInfiniteQuery` başlangıç verisi). */
  initialPage: FeedPage;
  /** Akış başlığının kimliği (`role="feed"` erişilebilir adı). */
  labelledBy: string;
  pollMs?: number;
};

const isSessionError = (error: unknown): boolean =>
  error instanceof FeedRequestError &&
  (error.code === ErrorCode.UNAUTHENTICATED || error.code === ErrorCode.ONBOARDING_REQUIRED);

/**
 * Akış listesi (istemci): SSR ilk sayfa + cursor'lı sonraki sayfalar (`GET /api/feed`).
 * - Sonsuz kaydırma: listenin sonundaki sentinel `IntersectionObserver` ile; klavye ve
 *   IntersectionObserver'sız ortam için her zaman "Daha fazla yükle" butonu (yedek).
 * - Sonraki sayfa hatası satır içi (Partial); otomatik yükleme kullanıcı "Tekrar dene" diyene
 *   kadar durur (hata döngüsü yok).
 * - "N yeni gönderi": yalnızca "En yeni"de, sekme görünürken 60 sn'de bir yoklama; banda basınca
 *   ilk sayfa tazelenir ve başa dönülür. Kendi gönderin bantta sayılmaz, composer sonrası
 *   `router.refresh()` ile gelen taze ilk sayfa listeye anında eklenir (read-your-own-writes).
 * - Silinen kendi gönderin `POST_DELETED_EVENT` ile listeden hemen çıkar.
 */
export const FeedList = ({
  tab,
  initialPage,
  labelledBy,
  pollMs = NEW_POSTS_POLL_MS,
}: FeedListProps): ReactElement => {
  const t = useTranslations('feed');
  const queryClient = useQueryClient();
  const handleResult = useActionResult();
  const queryKey = feedQueryKey(tab);

  const query = useInfiniteQuery<
    FeedPage,
    Error,
    FeedData,
    ReturnType<typeof feedQueryKey>,
    string | null
  >({
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchFeedPage(tab, pageParam, signal),
    initialPageParam: null,
    getNextPageParam: last => last.nextCursor,
    initialData: () => initialFeedData(initialPage),
    // Tazelik bu bileşende yönetilir (yoklama, composer sonrası birleştirme); arka planda
    // kendiliğinden yeniden çekilip kaydırma konumu kaybolmasın
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    // Otomatik yeniden deneme yok: hata satır içi gösterilir, "Tekrar dene" kullanıcıda
    retry: false,
  });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError, refetch } =
    query;

  // Sunucudan taze ilk sayfa (router.refresh): yeni kendi gönderin hemen başa gelir
  const seenInitial = useRef(initialPage);
  useEffect(() => {
    if (seenInitial.current === initialPage) return;
    seenInitial.current = initialPage;
    queryClient.setQueryData<FeedData>(feedQueryKey(tab), current =>
      current ? mergeFreshFirstPage(current, initialPage, tab) : initialFeedData(initialPage)
    );
  }, [initialPage, queryClient, tab]);

  useEffect(
    () =>
      onPostDeleted(postId =>
        queryClient.setQueryData<FeedData>(feedQueryKey(tab), current =>
          current ? removePostFromPages(current, postId) : current
        )
      ),
    [queryClient, tab]
  );

  // Oturum düştüyse sayfa hatasını göstermek yerine girişe yönlendir (taslak yok)
  const pageError = query.error;
  useEffect(() => {
    if (pageError && isSessionError(pageError) && pageError instanceof FeedRequestError) {
      handleResult(fail(pageError.code));
    }
  }, [pageError, handleResult]);

  const loadMore = useCallback(async (): Promise<void> => {
    await fetchNextPage();
  }, [fetchNextPage]);

  // Sonsuz kaydırma
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canAutoLoad = hasNextPage && !isFetchingNextPage && !isFetchNextPageError;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !canAutoLoad || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: PREFETCH_MARGIN }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canAutoLoad, loadMore]);

  // "N yeni gönderi" yoklaması
  const headCursor = data.pages[0]?.headCursor ?? null;
  // Sayım hangi başa göre yapıldıysa onunla saklanır: liste tazelenince (yeni baş) bant kendiliğinden kalkar
  const [polled, setPolled] = useState<{ since: string; count: number } | null>(null);
  const newCount = polled !== null && polled.since === headCursor ? polled.count : 0;
  useEffect(() => {
    if (tab !== 'latest' || headCursor === null) return;
    let controller: AbortController | null = null;
    const check = async (): Promise<void> => {
      if (document.visibilityState !== 'visible') return;
      controller?.abort();
      controller = new AbortController();
      try {
        const count = await fetchNewPostCount(headCursor, controller.signal);
        setPolled({ since: headCursor, count });
      } catch (error) {
        // Yoklama sessizdir: bant yalnızca gösterilmez; kullanıcı akışı kullanmaya devam eder
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          log.warn('new posts poll failed', { err: error });
        }
      }
    };
    const interval = window.setInterval(() => void check(), pollMs);
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      controller?.abort();
    };
  }, [tab, headCursor, pollMs]);

  const listRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const showNewPosts = async (): Promise<void> => {
    setRefreshing(true);
    queryClient.setQueryData<FeedData>(queryKey, current =>
      current ? keepFirstPage(current) : current
    );
    try {
      await refetch();
    } finally {
      setRefreshing(false);
      setPolled(null);
    }
    // Odak listenin başına: klavye/ekran okuyucu kullanıcısı yeni kartlardan devam eder
    listRef.current?.focus({ preventScroll: true });
    listRef.current?.scrollIntoView({ block: 'start' });
  };

  const items = flattenUnique(data);
  const setSize = hasNextPage ? -1 : items.length;

  return (
    <div className='relative'>
      {newCount > 0 ? (
        <div className='pointer-events-none sticky top-[calc(var(--spacing-topbar)+var(--spacing-hit))] z-10 flex justify-center py-2 md:top-hit'>
          <Button
            size='sm'
            data-testid='feed-new-posts'
            loading={refreshing}
            onClick={() => void showNewPosts()}
            className='pointer-events-auto rounded-full shadow-md'
          >
            <ArrowUp aria-hidden='true' className='size-4' />
            {newCount > NEW_POSTS_COUNT_CAP
              ? t('newPostsCapped', { count: NEW_POSTS_COUNT_CAP })
              : t('newPosts', { count: newCount })}
          </Button>
        </div>
      ) : null}
      {/* Bant görsel; ekran okuyucuya aynı bilgi kibarca bildirilir */}
      <p aria-live='polite' className='sr-only'>
        {newCount > 0
          ? newCount > NEW_POSTS_COUNT_CAP
            ? t('newPostsCapped', { count: NEW_POSTS_COUNT_CAP })
            : t('newPosts', { count: newCount })
          : ''}
      </p>

      <div
        ref={listRef}
        tabIndex={-1}
        role='feed'
        aria-labelledby={labelledBy}
        aria-busy={isFetchingNextPage || refreshing}
        data-testid='feed-list'
        data-tab={tab}
        className='scroll-mt-[calc(var(--spacing-topbar)+var(--spacing-hit))] outline-none md:scroll-mt-hit'
      >
        {items.map((post, index) => (
          <PostCard key={post.id} post={post} feedPosition={{ posInSet: index + 1, setSize }} />
        ))}
      </div>

      <div ref={sentinelRef} data-testid='feed-sentinel' aria-hidden='true' className='h-px' />

      {isFetchingNextPage ? (
        <div data-testid='feed-loading-more'>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : null}
      <p role='status' className='sr-only'>
        {isFetchingNextPage ? t('loadingMore') : ''}
      </p>

      {isFetchNextPageError && !isSessionError(pageError) ? (
        <ErrorState
          variant='inline'
          message={t('loadMoreError')}
          onRetry={loadMore}
          className='border-t border-border'
        />
      ) : null}

      {hasNextPage && !isFetchingNextPage && !isFetchNextPageError ? (
        <div className='flex justify-center border-t border-border px-4 py-3'>
          <Button variant='ghost' data-testid='feed-load-more' onClick={() => void loadMore()}>
            {t('loadMore')}
          </Button>
        </div>
      ) : null}

      {!hasNextPage && items.length > 0 ? (
        <p data-testid='feed-end' className='px-4 py-6 text-center text-sm text-fg-subtle'>
          {t('end')}
        </p>
      ) : null}
    </div>
  );
};
