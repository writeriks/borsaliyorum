import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { NAV_HREF } from './nav-routes';
import { ThemeToggle } from './theme-toggle';
import { Wordmark } from './wordmark';

/** Mobil üst bar (56px, sticky): wordmark, arama, tema. md+ gizlenir. */
export const TopBar = ({ className }: { className?: string }): ReactElement => {
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
      </div>
    </header>
  );
};
