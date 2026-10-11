'use client';

import { Heart } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { type ReactElement, useRef, useState } from 'react';

import { useActionResult } from '@/lib/client/action-result';
import type { Result } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

import { setPostLike } from '../server/actions';

export type LikeState = { liked: boolean; count: number };

/** Optimistic geçiş (saf; unit testli): sayaç 0'ın altına inmez. */
export const toggleLike = (state: LikeState): LikeState => ({
  liked: !state.liked,
  count: Math.max(0, state.count + (state.liked ? -1 : 1)),
});

type PostLikeButtonProps = {
  postId: number;
  initial: LikeState;
  /** Test/önizleme için action yerine geçer. */
  action?: (input: { postId: number; liked: boolean }) => Promise<Result<{ liked: boolean }>>;
};

/**
 * Beğeni (design-system: küçük aksiyonlar optimistic). Tıklamada durum hemen değişir; sunucu
 * reddederse önceki duruma döner ve `useActionResult` kullanıcıya bildirir (oturum düştüyse
 * girişe yönlendirir). İstek sürerken yeni tıklama beklemeye alınmaz, yok sayılır: sunucuya
 * yalnızca hedef durum (`liked`) gider, sıra karışmaz.
 */
export const PostLikeButton = ({
  postId,
  initial,
  action = setPostLike,
}: PostLikeButtonProps): ReactElement => {
  const t = useTranslations('post.actions');
  const tStats = useTranslations('post.stats');
  const format = useFormatter();
  const handleResult = useActionResult();
  const [state, setState] = useState<LikeState>(initial);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const onClick = async (): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    const previous = state;
    const next = toggleLike(previous);
    setState(next);
    let result: Result<{ liked: boolean }> | null = null;
    try {
      result = await action({ postId, liked: next.liked });
    } catch (error) {
      logger.warn('like action failed', { err: error });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
    if (result === null) {
      setState(previous);
      handleResult({ ok: false, error: 'INTERNAL' });
      return;
    }
    if (handleResult(result) === null) setState(previous);
  };

  return (
    <button
      type='button'
      aria-pressed={state.liked}
      aria-busy={pending || undefined}
      data-testid='post-like'
      onClick={() => void onClick()}
      className={cn(
        '-mx-2 inline-flex min-h-hit min-w-hit items-center gap-1.5 rounded-md px-2 text-sm tabular-nums',
        'transition-colors duration-(--duration-fast) hover:bg-bg-muted',
        // Kırmızı düşüş rengiyle karışmasın diye marka rengi (design-system)
        state.liked ? 'text-accent' : 'text-fg-subtle'
      )}
    >
      <Heart
        aria-hidden='true'
        className='size-5'
        strokeWidth={1.75}
        fill={state.liked ? 'currentColor' : 'none'}
      />
      <span aria-hidden='true' data-testid='post-like-count'>
        {format.number(state.count, { notation: 'compact', maximumFractionDigits: 1 })}
      </span>
      {/* Ad sabit ("Beğen"), durum aria-pressed ile: geçiş butonunda ad değişmez */}
      <span className='sr-only'>{`${t('like')}, ${tStats('likes', { count: state.count })}`}</span>
    </button>
  );
};
