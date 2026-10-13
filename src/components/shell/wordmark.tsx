import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type MonogramProps = { className?: string };

/** Accent zeminli, 8px radius'lu kare içinde "b" (favicon/uygulama ikonu ile aynı). */
export const Monogram = ({ className }: MonogramProps): ReactElement => {
  const t = useTranslations('shell');
  return (
    <span
      aria-hidden='true'
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-md bg-accent text-lg leading-none font-semibold text-accent-fg',
        className
      )}
    >
      {t('brand').charAt(0)}
    </span>
  );
};

type WordmarkProps = {
  /** `full`: her zaman yazı; `responsive`: md–lg ikon rayında monogram, xl'de yazı */
  variant?: 'full' | 'responsive';
  className?: string;
};

/** Geçici logo: Inter semibold, küçük harfli "borsalıyorum" (son çizim açık soru, tasarım §12). */
export const Wordmark = ({ variant = 'full', className }: WordmarkProps): ReactElement => {
  const t = useTranslations('shell');

  return (
    <Link
      href='/'
      aria-label={t('homeLabel')}
      className={cn(
        'inline-flex min-h-hit min-w-hit items-center gap-2 rounded-md text-lg font-semibold tracking-tight text-fg',
        className
      )}
    >
      {variant === 'responsive' ? <Monogram className='xl:hidden' /> : null}
      <span className={cn(variant === 'responsive' && 'hidden xl:inline')}>{t('brand')}</span>
    </Link>
  );
};
