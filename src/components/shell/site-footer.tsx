import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { InvestmentDisclaimer } from '@/components/legal/investment-disclaimer';
import { Link } from '@/i18n/navigation';
import { LEGAL_DOCUMENTS, LEGAL_HREF, type LegalDocumentKey } from '@/lib/legal/versions';
import { cn } from '@/lib/utils';

/** Footer etiket anahtarı (`shell.footer.*`) */
const LABEL_KEY = {
  disclaimer: 'disclaimerLink',
  privacy: 'privacy',
  cookies: 'cookies',
  terms: 'terms',
  community: 'community',
} as const satisfies Record<LegalDocumentKey, string>;

type SiteFooterProps = {
  /** Aynı sayfada iki kopya olabilir (mobil kolon altı + lg sağ kolon); id çakışmasın */
  idPrefix: string;
  className?: string;
};

/** Footer: yatırım tavsiyesi değildir uyarısının tam metni (her sayfada zorunlu) + yasal linkler. */
export const SiteFooter = ({ idPrefix, className }: SiteFooterProps): ReactElement => {
  const t = useTranslations('shell');

  return (
    <footer className={cn('flex flex-col gap-3 px-4 py-6', className)}>
      <InvestmentDisclaimer variant='full' id={`${idPrefix}-disclaimer`} />
      <nav aria-label={t('legalNav')}>
        <ul className='flex flex-wrap gap-x-1 text-xs text-fg-muted'>
          {LEGAL_DOCUMENTS.map(({ key }) => (
            <li key={key}>
              <Link
                href={LEGAL_HREF[key]}
                className='inline-flex min-h-hit min-w-hit items-center px-1 underline-offset-2 hover:text-fg hover:underline'
              >
                {t(`footer.${LABEL_KEY[key]}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className='text-xs text-fg-subtle'>{t('footer.copyright')}</p>
    </footer>
  );
};
