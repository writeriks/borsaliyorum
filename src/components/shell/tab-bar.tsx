import { Bell, CircleUser, Compass, House, SquarePen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { NavLink } from './nav-link';
import { NAV_HREF, profileHref } from './nav-routes';
import type { ShellViewer } from './types';

const TabSkeleton = ({ label }: { label?: string }): ReactElement => (
  <li className='flex min-h-hit flex-1 flex-col items-center justify-center gap-1' aria-busy='true'>
    {label ? <span className='sr-only'>{label}</span> : null}
    <Skeleton className='size-6 rounded-full' />
    <Skeleton className='h-2.5 w-10' />
  </li>
);

const bottomBarClasses =
  'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-subtle pb-[env(safe-area-inset-bottom)]';

type TabBarProps = { viewer: ShellViewer; className?: string };

/**
 * Mobil alt tab bar (Akış, Keşfet, Gönderi, Bildirimler, Profil), etiketler her zaman görünür.
 * Anonim kullanıcıya tab bar yerine "Sohbete katıl" bandı (tasarım §7.1); bu bant auth
 * çözülmeden render edilmez — `unknown` iken kişisel sekmeler skeleton.
 */
export const TabBar = ({ viewer, className }: TabBarProps): ReactElement => {
  const t = useTranslations();

  if (viewer.status === 'anonymous') {
    return (
      <div data-testid='join-banner' className={cn(bottomBarClasses, className)}>
        <p className='flex min-h-tabbar items-center justify-center gap-1 px-4 text-sm'>
          <span className='text-fg-muted'>{t('shell.joinPrompt')}</span>
          <Link
            href={NAV_HREF.signup}
            className='inline-flex min-h-hit min-w-hit items-center justify-center px-2 font-semibold text-accent'
          >
            {t('common.signup')}
          </Link>
          <span aria-hidden='true' className='text-fg-subtle'>
            {'·'}
          </span>
          <Link
            href={NAV_HREF.login}
            className='inline-flex min-h-hit min-w-hit items-center justify-center px-2 font-semibold text-accent'
          >
            {t('common.login')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <nav
      aria-label={t('shell.mainNav')}
      data-testid='tab-bar'
      className={cn(bottomBarClasses, className)}
    >
      <ul className='flex h-tabbar items-stretch justify-around px-1'>
        <li className='flex flex-1'>
          <NavLink
            variant='tab'
            href={NAV_HREF.feed}
            label={t('shell.nav.feed')}
            icon={<House aria-hidden='true' />}
          />
        </li>
        <li className='flex flex-1'>
          <NavLink
            variant='tab'
            href={NAV_HREF.explore}
            label={t('shell.nav.explore')}
            icon={<Compass aria-hidden='true' />}
          />
        </li>
        <li className='flex flex-1'>
          <NavLink
            variant='tab'
            href={NAV_HREF.compose}
            label={t('shell.nav.compose')}
            icon={<SquarePen aria-hidden='true' />}
          />
        </li>
        {viewer.status === 'authenticated' ? (
          <>
            <li className='flex flex-1'>
              <NavLink
                variant='tab'
                href={NAV_HREF.notifications}
                label={t('shell.nav.notifications')}
                icon={<Bell aria-hidden='true' />}
              />
            </li>
            <li className='flex flex-1'>
              <NavLink
                variant='tab'
                href={profileHref(viewer.user.username)}
                label={t('shell.nav.profile')}
                icon={<CircleUser aria-hidden='true' />}
              />
            </li>
          </>
        ) : (
          <>
            <TabSkeleton label={t('shell.accountLoading')} />
            <TabSkeleton />
          </>
        )}
      </ul>
    </nav>
  );
};
