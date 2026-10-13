import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { NAV_HREF } from './nav-routes';
import { ThemeToggle } from './theme-toggle';
import { TopBarAccount } from './top-bar-account';
import { type ShellViewer, UNKNOWN_VIEWER } from './types';
import { Wordmark } from './wordmark';

type TopBarProps = { className?: string; viewer?: ShellViewer };

/** Mobil üst bar (56px, sticky): wordmark, arama, tema, hesap menüsü. md+ gizlenir. */
export const TopBar = ({ className, viewer = UNKNOWN_VIEWER }: TopBarProps): ReactElement => {
  const t = useTranslations('shell');

  return (
    <header
      data-testid='top-bar'
      className={cn(
        'sticky top-0 z-20 flex h-topbar items-center justify-between gap-2 border-b border-border bg-bg px-2',
        className
      )}
    >
      <Wordmark className='px-2' />
      <div className='flex items-center'>
        <Button asChild variant='ghost' size='icon'>
          <Link href={NAV_HREF.search} aria-label={t('nav.search')}>
            <Search aria-hidden='true' />
          </Link>
        </Button>
        <ThemeToggle />
        <TopBarAccount viewer={viewer} />
      </div>
    </header>
  );
};
