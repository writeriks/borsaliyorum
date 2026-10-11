'use client';

import { type InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactElement, useCallback } from 'react';

import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { commentsQueryKey, fetchCommentsPage } from '../client/api';
import type { CommentsPage } from '../types';

import { CommentComposer, type CreateCommentAction } from './comment-composer';
import { CommentItem, type CommentLikeAction } from './comment-item';
import type { DeleteCommentAction } from './comment-menu';

type PageParam = string | null;

type CommentThreadProps = {
  postId: number;
  viewerId: number | null;
  replyToUsername: string;
  loginHref: string;
  signupHref: string;
  /** Sunucuda render edilen ilk sayfa; yüklenemediyse `null` (istemci kendisi dener). */
  initialPage: CommentsPage | null;
  /** Testte sabit "şimdi" ve action/fetch yerine geçenler. */
  now?: string;
  fetchPage?: (postId: number, cursor: PageParam, signal?: AbortSignal) => Promise<CommentsPage>;
  actions?: {
    create?: CreateCommentAction;
    like?: CommentLikeAction;
    delete?: DeleteCommentAction;
  };
};

/** İlk sayfa sunucudan geldiyse bu süre içinde hidrasyonda yeniden istenmez. */
const INITIAL_STALE_MS = 30_000;

/** Yorum satırı ölçüsünde iskelet (CLS yok); içerik yüklemesi, auth değil. */
export const CommentSkeleton = (): ReactElement => (
  <div
    data-testid='comment-skeleton'
    data-skeleton='content'
    className='flex gap-3 border-b border-border px-3 py-3 sm:px-4'
  >
    <Skeleton className='size-9 shrink-0 rounded-full sm:size-10' />
    <div className='flex flex-1 flex-col gap-2'>
      <Skeleton className='h-4 w-40' />
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-4 w-2/3' />
    </div>
  </div>
);

/**
 * Yorumlar (S12): composer + eskiden yeniye liste + "Daha fazla yükle". İlk sayfa sunucuda render
 * edilir ve `useInfiniteQuery`'ye `initialData` olarak verilir; sonraki sayfalar
 * `GET /api/posts/[id]/comments?cursor=`. Yeni yorum ya da silme sonrası yüklü sayfalar yeniden
 * doğrulanır ve sunucu verisi (gönderi kartındaki yorum sayacı) tazelenir. Dört durum: yükleniyor
 * (iskelet), boş, hata (tümü ya da liste sonunda satır içi), başarı.
 */
export const CommentThread = ({
  postId,
  viewerId,
  replyToUsername,
  loginHref,
  signupHref,
  initialPage,
  now,
  fetchPage = fetchCommentsPage,
  actions = {},
}: CommentThreadProps): ReactElement => {
  const t = useTranslations('comments');
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = commentsQueryKey(postId);

  const query = useInfiniteQuery<
    CommentsPage,
    Error,
    InfiniteData<CommentsPage, PageParam>,
    readonly ['comments', number],
    PageParam
  >({
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchPage(postId, pageParam, signal),
    initialPageParam: null,
    getNextPageParam: last => last.nextCursor,
    ...(initialPage
      ? {
          initialData: { pages: [initialPage], pageParams: [null] },
          staleTime: INITIAL_STALE_MS,
        }
      : {}),
  });

  const refreshAll = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey });
    // Gönderi kartındaki yorum sayacı sunucu bileşeninde
    router.refresh();
  }, [queryClient, queryKey, router]);

  const onDeleted = useCallback(
    (commentId: number): void => {
      queryClient.setQueryData<InfiniteData<CommentsPage, PageParam>>(queryKey, data =>
        data
          ? {
              ...data,
              pages: data.pages.map(page => ({
                ...page,
                items: page.items.filter(item => item.id !== commentId),
              })),
            }
          : data
      );
      refreshAll();
    },
    [queryClient, queryKey, refreshAll]
  );

  const items = query.data?.pages.flatMap(page => page.items) ?? [];

  let list: ReactElement;
  if (query.isPending) {
    list = (
      <div aria-busy='true'>
        <span className='sr-only'>{t('loading')}</span>
        <CommentSkeleton />
        <CommentSkeleton />
      </div>
    );
  } else if (query.isError && items.length === 0) {
    list = (
      <ErrorState message={t('error')} onRetry={() => query.refetch().then(() => undefined)} />
    );
  } else if (items.length === 0) {
    list = (
      <EmptyState
        icon={MessageCircle}
        message={viewerId === null ? t('emptyAnonymous') : t('empty')}
      />
    );
  } else {
    list = (
      <>
        <ul aria-label={t('listLabel')} data-testid='comment-list'>
          {items.map(comment => (
            <li key={comment.id}>
              <CommentItem
                comment={comment}
                onDeleted={onDeleted}
                now={now}
                likeAction={actions.like}
                deleteAction={actions.delete}
              />
            </li>
          ))}
        </ul>
        {query.isFetchNextPageError ? (
          <ErrorState
            variant='inline'
            message={t('loadMoreError')}
            onRetry={() => query.fetchNextPage().then(() => undefined)}
          />
        ) : query.hasNextPage ? (
          <div className='flex justify-center px-4 py-3'>
            <Button
              variant='ghost'
              loading={query.isFetchingNextPage}
              data-testid='comments-load-more'
              onClick={() => void query.fetchNextPage()}
            >
              {t('loadMore')}
            </Button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className='flex flex-col'>
      <div className='border-b border-border p-3 sm:p-4'>
        <CommentComposer
          postId={postId}
          viewerId={viewerId}
          replyToUsername={replyToUsername}
          loginHref={loginHref}
          signupHref={signupHref}
          onSubmitted={refreshAll}
          action={actions.create}
        />
      </div>
      {list}
    </div>
  );
};
