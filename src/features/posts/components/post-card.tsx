import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { RichText, userHref } from '@/components/rich-text';
import { LinkPreviewCard } from '@/features/link-preview/components/link-preview-card';
import { Link } from '@/i18n/navigation';
import { toSafeMediaSrc } from '@/lib/media';
import { cn } from '@/lib/utils';

import { toLinkPreviewDto } from '../link-preview';
import type { PostCardData } from '../types';

import { AuthorAvatar } from './author-avatar';
import { ClampedBody } from './clamped-body';
import { SentimentTag, SponsoredLabel } from './post-labels';
import { PostLikeButton } from './post-like-button';
import { PostMedia } from './post-media';
import { PostOwnerMenu } from './post-owner-menu';
import { PostStats } from './post-stats';
import { RelativeTime } from './relative-time';

export const postHref = (id: number): string => `/gonderi/${id}`;

type PostCardProps = {
  post: PostCardData;
  /** `feed`: gövde 6 satırda kırpılır; `detail`: tam metin. */
  variant?: 'feed' | 'detail';
  /** Göreli zaman için sabit "şimdi" (test/önizleme). */
  now?: string;
  className?: string;
};

/**
 * Salt okunur gönderi kartı (tasarım §7.4). Server Component; etkileşimli yapraklar (zaman
 * tooltip'i, hover kartı, "Devamını gör") istemci bileşenleri. Kartın erişilebilir adı gövde
 * değil "Gönderi, {ad}, {zaman}"; detaya giden link zaman öğesidir.
 */
export const PostCard = ({
  post,
  variant = 'feed',
  now,
  className,
}: PostCardProps): ReactElement => {
  const t = useTranslations('post');
  const ids = {
    label: `post-${post.id}-label`,
    author: `post-${post.id}-author`,
    time: `post-${post.id}-time`,
    body: `post-${post.id}-body`,
  };
  const profile = userHref(post.author.username);
  const avatarSrc = toSafeMediaSrc(post.author.avatarUrl);
  const mediaSrc = toSafeMediaSrc(post.mediaUrl);
  const hasMedia = mediaSrc !== null;
  // Medya varsa önizleme yok (tasarım §6, [LPV-04])
  const linkPreview = hasMedia ? null : toLinkPreviewDto(post.linkPreview);
  const body = (
    <RichText text={post.body.text} entities={post.body.entities} stocks={post.stocks} />
  );

  return (
    <article
      aria-labelledby={`${ids.label} ${ids.author} ${ids.time}`}
      data-testid='post-card'
      data-post-id={post.id}
      className={cn('flex flex-col gap-2 border-b border-border px-3 py-3 sm:px-4', className)}
    >
      <span id={ids.label} className='sr-only'>
        {t('cardLabel')}
      </span>
      {post.isSponsored ? <SponsoredLabel /> : null}
      <div className='flex gap-3'>
        <Link href={profile} tabIndex={-1} aria-hidden='true' className='shrink-0 self-start'>
          <AuthorAvatar displayName={post.author.displayName} src={avatarSrc} />
        </Link>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <header className='flex items-start gap-2'>
            <div className='flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1 text-sm'>
              <Link
                id={ids.author}
                href={profile}
                className='truncate font-semibold text-fg hover:underline'
              >
                {post.author.displayName}
              </Link>
              <span className='truncate text-fg-subtle'>{`@${post.author.username}`}</span>
              <span aria-hidden='true' className='text-fg-subtle'>
                {'·'}
              </span>
              <RelativeTime
                id={ids.time}
                dateTime={post.createdAt}
                href={postHref(post.id)}
                now={now}
              />
            </div>
            <SentimentTag sentiment={post.sentiment} />
            {post.viewer?.isOwner ? <PostOwnerMenu postId={post.id} /> : null}
          </header>
          {/* Taşma kırpılır: v1'den gelen (normalize edilmemiş) zalgo metnin birleştirici
              işaretleri satır kutusundan taşıp komşu kartların üstüne binmesin. v2 metni
              normalize'da grafem başına 4 işaretle sınırlı; bu ikinci savunma hattı. */}
          <div data-slot='post-body' className='min-w-0 overflow-hidden'>
            {variant === 'feed' ? (
              <ClampedBody id={ids.body} text={post.body.text}>
                {body}
              </ClampedBody>
            ) : (
              body
            )}
          </div>
          {hasMedia ? (
            <div className='mt-2'>
              <PostMedia src={mediaSrc} />
            </div>
          ) : null}
          {linkPreview ? (
            <div className='mt-2'>
              <LinkPreviewCard preview={linkPreview} />
            </div>
          ) : null}
          <PostStats
            counts={post.counts}
            likeControl={
              post.viewer ? (
                <PostLikeButton
                  postId={post.id}
                  initial={{ liked: post.viewer.liked, count: post.counts.likes }}
                />
              ) : undefined
            }
          />
        </div>
      </div>
    </article>
  );
};
