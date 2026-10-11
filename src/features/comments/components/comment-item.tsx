'use client';

import { Heart } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { RichText, userHref } from '@/components/rich-text';
import { AuthorAvatar } from '@/features/posts/components/author-avatar';
import { postHref } from '@/features/posts/components/post-href';
import { PostLikeButton } from '@/features/posts/components/post-like-button';
import { RelativeTime } from '@/features/posts/components/relative-time';
import { Link } from '@/i18n/navigation';
import type { Result } from '@/lib/errors';
import { toSafeMediaSrc } from '@/lib/media';

import { setCommentLike } from '../server/actions';
import type { CommentData } from '../types';

import { CommentMenu, type DeleteCommentAction } from './comment-menu';

export type CommentLikeAction = (input: {
  commentId: number;
  liked: boolean;
}) => Promise<Result<{ liked: boolean }>>;

export const commentAnchorId = (commentId: number): string => `yorum-${commentId}`;

type CommentItemProps = {
  comment: CommentData;
  onDeleted: (commentId: number) => void;
  /** Göreli zaman için sabit "şimdi" (test). */
  now?: string;
  likeAction?: CommentLikeAction;
  deleteAction?: DeleteCommentAction;
};

/**
 * Tek yorum (tasarım §8 CommentItem): avatar, ad, @kullanıcı, göreli zaman (yorumun kalıcı
 * bağlantısı), gövde (`RichText`; içerik kırpılmaz), beğeni ve sahibine/moderatöre silme.
 * Beğeni, gönderi beğenisinin optimistic + kuyruklu butonunu kullanır (aynı davranış ve metin);
 * yalnızca action yoruma bağlanır. Anonimde beğeni sayısı salt okunur.
 */
export const CommentItem = ({
  comment,
  onDeleted,
  now,
  likeAction = setCommentLike,
  deleteAction,
}: CommentItemProps): ReactElement => {
  const t = useTranslations('comments');
  const tStats = useTranslations('post.stats');
  const format = useFormatter();
  const anchor = commentAnchorId(comment.id);
  const ids = { label: `${anchor}-label`, author: `${anchor}-author`, time: `${anchor}-time` };
  const profile = userHref(comment.author.username);

  return (
    <article
      id={anchor}
      aria-labelledby={`${ids.label} ${ids.author} ${ids.time}`}
      data-testid='comment'
      data-comment-id={comment.id}
      className='flex scroll-mt-16 gap-3 border-b border-border px-3 py-3 sm:px-4'
    >
      <span id={ids.label} className='sr-only'>
        {t('itemLabel')}
      </span>
      <Link href={profile} tabIndex={-1} aria-hidden='true' className='shrink-0 self-start'>
        <AuthorAvatar
          displayName={comment.author.displayName}
          src={toSafeMediaSrc(comment.author.avatarUrl)}
        />
      </Link>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <header className='flex items-start gap-2'>
          <div className='flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1 text-sm'>
            <Link
              id={ids.author}
              href={profile}
              className='truncate font-semibold text-fg hover:underline'
            >
              {comment.author.displayName}
            </Link>
            <span className='truncate text-fg-subtle'>{`@${comment.author.username}`}</span>
            <span aria-hidden='true' className='text-fg-subtle'>
              {'·'}
            </span>
            <RelativeTime
              id={ids.time}
              dateTime={comment.createdAt}
              href={`${postHref(comment.postId)}#${anchor}`}
              now={now}
            />
          </div>
          {comment.viewer?.canDelete ? (
            <CommentMenu
              commentId={comment.id}
              onDeleted={() => onDeleted(comment.id)}
              action={deleteAction}
            />
          ) : null}
        </header>
        {/* Kart gövdesiyle aynı taşma koruması (eski verideki birleştirici işaretler) */}
        <div data-slot='comment-body' className='min-w-0 overflow-hidden'>
          <RichText
            text={comment.body.text}
            entities={comment.body.entities}
            stocks={comment.stocks}
          />
        </div>
        <div className='flex min-h-hit items-center'>
          {comment.viewer ? (
            <PostLikeButton
              postId={comment.id}
              initial={{ liked: comment.viewer.liked, count: comment.likes }}
              action={({ postId: commentId, liked }) => likeAction({ commentId, liked })}
            />
          ) : (
            <span className='inline-flex min-h-hit items-center gap-1.5 text-sm text-fg-subtle tabular-nums'>
              <Heart aria-hidden='true' className='size-5' strokeWidth={1.75} />
              <span aria-hidden='true'>
                {format.number(comment.likes, { notation: 'compact', maximumFractionDigits: 1 })}
              </span>
              <span className='sr-only'>{tStats('likes', { count: comment.likes })}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
