import { Bell, CircleUser, Compass, House, Settings, SquarePen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { AuthSlot } from './auth-slot';
import { NavLink } from './nav-link';
import { NAV_HREF, profileHref } from './nav-routes';
import { ThemeToggle } from './theme-toggle';
import type { ShellViewer } from './types';
import { Wordmark } from './wordmark';

const NavSkeleton = (): ReactElement => (
  <li
    aria-hidden='true'
    className='flex min-h-hit items-center justify-center gap-4 xl:justify-start xl:px-3'
  >
    <Skeleton className='size-6 rounded-full' />
    <Skeleton className='hidden h-4 w-24 xl:block' />
  </li>
);

type SideNavProps = { viewer: ShellViewer; className?: string };

/** md–lg: 72px ikon rayı; xl: 248px etiketli menü (tasarım §7.2–7.3). */
export const SideNav = ({ viewer, className }: SideNavProps): ReactElement => {
  const t = useTranslations();

  return (
    <div
      data-testid='side-nav'
      className={cn(
        'sticky top-0 h-dvh w-rail shrink-0 flex-col gap-2 overflow-y-auto px-3 py-3 xl:w-sidenav xl:px-4',
        className
      )}
    >
      <Wordmark variant='responsive' className='self-center xl:self-start xl:px-3' />
      <nav aria-label={t('shell.mainNav')} className='mt-2'>
        <ul className='flex flex-col gap-1'>
          <li>
            <NavLink
              variant='side'
              href={NAV_HREF.feed}
              label={t('shell.nav.feed')}
              icon={<House aria-hidden='true' />}
            />
          </li>
          <li>
            <NavLink
              variant='side'
              href={NAV_HREF.explore}
              label={t('shell.nav.explore')}
              icon={<Compass aria-hidden='true' />}
            />
          </li>
          {viewer.status === 'unknown' ? (
            <>
              <NavSkeleton />
              <NavSkeleton />
              <NavSkeleton />
            </>
          ) : null}
          {viewer.status === 'authenticated' ? (
            <>
              <li>
                <NavLink
                  variant='side'
                  href={NAV_HREF.notifications}
                  label={t('shell.nav.notifications')}
                  icon={<Bell aria-hidden='true' />}
                />
              </li>
              <li>
                <NavLink
                  variant='side'
                  href={profileHref(viewer.user.username)}
                  label={t('shell.nav.profile')}
                  icon={<CircleUser aria-hidden='true' />}
                />
              </li>
              <li>
                <NavLink
                  variant='side'
                  href={NAV_HREF.settings}
                  label={t('shell.nav.settings')}
                  icon={<Settings aria-hidden='true' />}
                />
              </li>
            </>
          ) : null}
        </ul>
      </nav>

      <Button asChild size='lg' className='mt-2 hidden w-full rounded-full xl:inline-flex'>
        <Link href={NAV_HREF.compose}>{t('shell.composeCta')}</Link>
      </Button>
      <div className='mt-2 flex justify-center xl:hidden'>
        <Button asChild size='icon' className='rounded-full'>
          <Link href={NAV_HREF.compose} aria-label={t('shell.composeCta')}>
            <SquarePen aria-hidden='true' />
          </Link>
        </Button>
      </div>

      <div className='mt-auto flex flex-col gap-2 pt-4'>
        <ThemeToggle withLabel align='start' className='self-center xl:w-full xl:self-stretch' />
        <AuthSlot viewer={viewer} />
      </div>
    </div>
  );
};
