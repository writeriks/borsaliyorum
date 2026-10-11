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
 * Beğeni (design-system: küçük aksiyonlar optimistic). Tıklamada görünen durum hemen değişir.
 * İstek sürerken gelen tıklamalar **kuyruğa alınır**: aynı anda tek istek gider (sıra karışmaz);
 * yanıt gelince görünen durum (kullanıcının son niyeti) sunucudakinden farklıysa yeni istek
 * gider, aynıysa (çift tıklama) gitmez. Sunucu reddederse son onaylanan duruma dönülür ve
 * `useActionResult` kullanıcıya bildirir (oturum düştüyse girişe yönlendirir).
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
  /** Görünen durum (son niyet); render'dan bağımsız, döngü içinde güncel okunur. */
  const desired = useRef<LikeState>(initial);
  /** Sunucunun onayladığı son durum. */
  const confirmed = useRef<LikeState>(initial);
  const inFlight = useRef(false);

  const show = (next: LikeState): void => {
    desired.current = next;
    setState(next);
  };

  const sync = async (): Promise<void> => {
    inFlight.current = true;
    setPending(true);
    try {
      while (desired.current.liked !== confirmed.current.liked) {
        const target = desired.current;
        let result: Result<{ liked: boolean }> | null = null;
        try {
          result = await action({ postId, liked: target.liked });
        } catch (error) {
          logger.warn('like action failed', { err: error });
        }
        if (result === null || !result.ok) {
          show(confirmed.current);
          handleResult(result ?? { ok: false, error: 'INTERNAL' });
          return;
        }
        confirmed.current = target;
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  const onClick = (): void => {
    show(toggleLike(desired.current));
    if (!inFlight.current) void sync();
  };

  return (
    <button
      type='button'
      aria-pressed={state.liked}
      aria-busy={pending || undefined}
      data-testid='post-like'
      onClick={onClick}
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
