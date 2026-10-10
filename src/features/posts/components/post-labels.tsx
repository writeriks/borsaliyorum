import { Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { cn } from '@/lib/utils';

import type { Sentiment } from '../types';

const SENTIMENT_STYLE = {
  bullish: { glyph: '▲', className: 'bg-up-bg text-up' },
  bearish: { glyph: '▼', className: 'bg-down-bg text-down' },
} as const;

/**
 * Küçük duyarlılık etiketi (tasarım §7.4): yön glif + metinle, renk ek ipucu. Nötrde etiket yok.
 */
export const SentimentTag = ({ sentiment }: { sentiment: Sentiment }): ReactElement | null => {
  const t = useTranslations('post.sentiment');
  if (sentiment === 'neutral') return null;
  const style = SENTIMENT_STYLE[sentiment];
  return (
    <span
      data-slot='sentiment-tag'
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium whitespace-pre',
        style.className
      )}
    >
      <span aria-hidden='true'>{style.glyph}</span> {t(sentiment)}
    </span>
  );
};

/**
 * "Reklam / İşbirliği" etiketi (docs/legal/composer-metinleri.md HD-2): her zaman metin olarak
 * görünür, zeminle içerikten ayrılır ve gönderi gövdesinden küçük punto kullanmaz (legal, tasarımın
 * `text-xs` önerisinin önünde). DOM'da yazar adından önce gelir ([LEG-03]).
 */
export const SponsoredLabel = (): ReactElement => {
  const t = useTranslations('post');
  return (
    <p
      data-slot='sponsored-label'
      className='inline-flex items-center gap-1.5 self-start rounded-sm bg-bg-muted px-2 py-0.5 text-post font-medium text-fg-muted'
    >
      <Megaphone aria-hidden='true' className='size-3.5' strokeWidth={1.75} />
      {t('sponsoredLabel')}
    </p>
  );
};
