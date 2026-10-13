import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { FEED_TAB_PARAM, FEED_TAB_SLUG, FEED_TABS, type FeedTab } from '../types';

export const FEED_PATH = '/akis';

export const feedTabHref = (tab: FeedTab): { pathname: string; query?: Record<string, string> } =>
  tab === 'latest'
    ? { pathname: FEED_PATH }
    : { pathname: FEED_PATH, query: { [FEED_TAB_PARAM]: FEED_TAB_SLUG[tab] } };

/**
 * "En yeni" / "Popüler". Sekmeler sayfa gezinmesidir (her sekmenin ilk sayfası sunucuda render
 * edilir, URL paylaşılabilir): bu yüzden ARIA `tablist` değil, `aria-current` taşıyan link
 * listesi. Mobilde üst barın, md+ sayfanın en üstüne yapışık (44px).
 */
export const FeedTabs = ({ active }: { active: FeedTab }): ReactElement => {
  const t = useTranslations('feed.tabs');
  return (
    <nav
      aria-label={t('label')}
      data-testid='feed-tabs'
      className='sticky top-topbar z-20 border-b border-border bg-bg md:top-0'
    >
      <ul className='flex'>
        {FEED_TABS.map(tab => (
          <li key={tab} className='flex flex-1'>
            <Link
              href={feedTabHref(tab)}
              aria-current={tab === active ? 'page' : undefined}
              data-testid={`feed-tab-${tab}`}
              scroll={false}
              className={cn(
                'relative flex min-h-hit flex-1 items-center justify-center px-4 text-sm text-fg-muted',
                'transition-colors duration-(--duration-fast) hover:bg-bg-muted hover:text-fg',
                'aria-[current=page]:font-semibold aria-[current=page]:text-fg',
                'aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-6 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-accent'
              )}
            >
              {t(tab)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
