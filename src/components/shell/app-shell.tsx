import { useTranslations } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import { RightRail } from './right-rail';
import { SideNav } from './side-nav';
import { SiteFooter } from './site-footer';
import { TabBar } from './tab-bar';
import { TopBar } from './top-bar';
import { type ShellViewer, UNKNOWN_VIEWER } from './types';

export const MAIN_CONTENT_ID = 'icerik';

type AppShellProps = {
  children: ReactNode;
  /** Sunucudan çözülmüş oturum; verilmezse `unknown` (skeleton, asla "Giriş yap"). */
  viewer?: ShellViewer;
};

/**
 * Uygulama kabuğu (docs/design/v2-design-system.md §6–7). Layout yalnızca CSS breakpoint'leriyle
 * değişir (JS ile isMobile yok → SSR'da CLS yok):
 * - <md: üst bar + tek kolon + alt tab bar
 * - md: 72px ikon rayı + akış; lg: + 336px sağ kolon; xl: 248px etiketli sol menü
 * - Akış kolonu en fazla 640px.
 */
export const AppShell = ({ children, viewer = UNKNOWN_VIEWER }: AppShellProps): ReactElement => {
  const t = useTranslations('shell');

  return (
    <>
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className='sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-70 focus:inline-flex focus:min-h-hit focus:items-center focus:rounded-md focus:bg-accent focus:px-4 focus:text-accent-fg'
      >
        {t('skipToContent')}
      </a>
      <div className='flex min-h-dvh w-full justify-center lg:gap-6 xl:gap-8'>
        <SideNav viewer={viewer} className='hidden md:flex' />
        <div
          data-testid='feed-column'
          className='flex w-full max-w-feed min-w-0 flex-col md:border-x md:border-border'
        >
          <TopBar className='md:hidden' />
          <main id={MAIN_CONTENT_ID} tabIndex={-1} className='flex-1 outline-none'>
            {children}
          </main>
          <SiteFooter
            idPrefix='footer'
            className='border-t border-border pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+24px)] md:pb-6 lg:hidden'
          />
        </div>
        <RightRail className='hidden lg:flex' />
      </div>
      <TabBar viewer={viewer} className='md:hidden' />
    </>
  );
};
