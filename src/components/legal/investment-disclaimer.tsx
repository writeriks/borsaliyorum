import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Link } from '@/i18n/navigation';
import { LEGAL_HREF } from '@/lib/legal/versions';
import { cn } from '@/lib/utils';

/** Kalıcı, paylaşılabilir tam metin adresi (docs/legal/composer-metinleri.md, HD-1) */
export const DISCLAIMER_HREF = LEGAL_HREF.disclaimer;

type InvestmentDisclaimerProps = {
  /**
   * `short`: gönderi composer'ı ve hisse hover kartı; `comment`: yorum composer'ı (genişleyince);
   * `full`: footer ve hisse sayfası. Metinler legal-advisor'dan; kapatılamaz.
   */
  variant: 'short' | 'comment' | 'full';
  /** Editörün `aria-describedby`'ı için */
  id?: string;
  className?: string;
};

export const InvestmentDisclaimer = ({
  variant,
  id,
  className,
}: InvestmentDisclaimerProps): ReactElement => {
  const t = useTranslations('legal.disclaimer');

  if (variant === 'full') {
    const headingId = id ? `${id}-title` : undefined;
    return (
      <section
        id={id}
        aria-labelledby={headingId}
        data-slot='investment-disclaimer'
        className={cn('flex flex-col gap-1 text-xs', className)}
      >
        <h2 id={headingId} className='font-semibold text-fg-muted'>
          {t('title')}
        </h2>
        <p className='text-fg-subtle'>{t('full')}</p>
      </section>
    );
  }

  return (
    <p
      id={id}
      data-slot='investment-disclaimer'
      className={cn('text-xs text-fg-subtle', className)}
    >
      {variant === 'short' ? t('short') : t('comment')}
      <span aria-hidden='true'>{' · '}</span>
      <Link href={DISCLAIMER_HREF} className='font-medium text-accent underline underline-offset-2'>
        {t('more')}
      </Link>
    </p>
  );
};
