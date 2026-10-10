import { Hash } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { NAV_HREF } from './nav-routes';
import { SiteFooter } from './site-footer';

/**
 * lg+ sağ kolon (336px, sticky). Gündem listesi henüz yok → boş durum yer tutucusu.
 * Başlık ölçütü açıkça yazar ("Son 24 saatte en çok bahsedilenler"); "Yükselenler" yok (SPK).
 */
export const RightRail = ({ className }: { className?: string }): ReactElement => {
  const t = useTranslations('shell');

  return (
    <aside
      aria-label={t('aside')}
      data-testid='right-rail'
      className={cn(
        'sticky top-0 h-dvh w-aside shrink-0 flex-col gap-4 overflow-y-auto py-3',
        className
      )}
    >
      <section
        aria-labelledby='trending-title'
        className='rounded-lg border border-border bg-bg-subtle'
      >
        <h2 id='trending-title' className='px-4 pt-4 text-md font-semibold'>
          {t('trendingTitle')}
        </h2>
        <EmptyState
          icon={Hash}
          message={t('trendingEmpty')}
          className='py-8'
          action={
            <Button asChild variant='outline'>
              <Link href={NAV_HREF.feed}>{t('trendingEmptyAction')}</Link>
            </Button>
          }
        />
      </section>
      <SiteFooter idPrefix='aside' className='px-0' />
    </aside>
  );
};
