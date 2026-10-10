import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Avatar, AvatarFallback, AvatarImage, initialsOf } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';

import { NAV_HREF, profileHref } from './nav-routes';
import type { ShellViewer } from './types';

/**
 * Sol menünün altındaki kullanıcı alanı. `unknown` → aynı ölçüde skeleton; "Giriş yap"
 * yalnızca sunucu `anonymous` dediğinde (auth-session UX kuralı 1).
 */
export const AuthSlot = ({ viewer }: { viewer: ShellViewer }): ReactElement => {
  const t = useTranslations();

  if (viewer.status === 'unknown') {
    return (
      <div
        data-testid='auth-slot-skeleton'
        aria-busy='true'
        className='flex min-h-hit items-center justify-center gap-3 xl:justify-start xl:px-3'
      >
        <span className='sr-only'>{t('shell.accountLoading')}</span>
        <Skeleton className='size-10 shrink-0 rounded-full' />
        <div className='hidden flex-1 flex-col gap-1.5 xl:flex'>
          <Skeleton className='h-3.5 w-28' />
          <Skeleton className='h-3 w-20' />
        </div>
      </div>
    );
  }

  if (viewer.status === 'anonymous') {
    return (
      <div className='flex flex-col items-center gap-2 xl:items-stretch'>
        <Button asChild size='lg' className='hidden xl:inline-flex'>
          <Link href={NAV_HREF.signup}>{t('common.signup')}</Link>
        </Button>
        <Button asChild variant='outline' size='lg' className='hidden xl:inline-flex'>
          <Link href={NAV_HREF.login}>{t('common.login')}</Link>
        </Button>
        <Button asChild variant='ghost' size='icon' className='xl:hidden'>
          <Link href={NAV_HREF.login} aria-label={t('common.login')}>
            <LogIn aria-hidden='true' />
          </Link>
        </Button>
      </div>
    );
  }

  const { user } = viewer;
  return (
    <Link
      href={profileHref(user.username)}
      aria-label={`${user.displayName} @${user.username}`}
      className='flex min-h-hit items-center justify-center gap-3 rounded-full p-1 hover:bg-bg-muted xl:justify-start xl:px-3'
    >
      <Avatar className='size-10'>
        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt='' /> : null}
        <AvatarFallback>{initialsOf(user.displayName)}</AvatarFallback>
      </Avatar>
      <span aria-hidden='true' className='hidden min-w-0 flex-col xl:flex'>
        <span className='truncate text-sm font-semibold text-fg'>{user.displayName}</span>
        <span className='truncate text-xs text-fg-subtle'>{`@${user.username}`}</span>
      </span>
    </Link>
  );
};
