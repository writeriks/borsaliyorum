import { Heart, type LucideIcon, MessageCircle, Repeat2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import type { PostCounts } from '../types';

const ITEMS: readonly { key: keyof PostCounts; icon: LucideIcon }[] = [
  { key: 'comments', icon: MessageCircle },
  { key: 'reposts', icon: Repeat2 },
  { key: 'likes', icon: Heart },
];

/**
 * Salt okunur sayaçlar (etkileşim S10/S11'de bu yerleşime buton olarak gelir; 44px satır şimdiden
 * rezerve). Görünen sayı kısaltılmış (`1,2 B`), ekran okuyucuya tam sayı ve birim okunur.
 */
export const PostStats = ({ counts }: { counts: PostCounts }): ReactElement => {
  const t = useTranslations('post.stats');
  const format = useFormatter();
  return (
    <ul aria-label={t('label')} className='flex items-center gap-6'>
      {ITEMS.map(({ key, icon: Icon }) => (
        <li
          key={key}
          className='inline-flex min-h-hit items-center gap-1.5 text-sm text-fg-subtle tabular-nums'
        >
          <Icon aria-hidden='true' className='size-5' strokeWidth={1.75} />
          <span aria-hidden='true'>
            {format.number(counts[key], { notation: 'compact', maximumFractionDigits: 1 })}
          </span>
          <span className='sr-only'>{t(key, { count: counts[key] })}</span>
        </li>
      ))}
    </ul>
  );
};
