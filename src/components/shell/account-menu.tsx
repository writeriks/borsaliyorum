'use client';

import { CircleUser, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { useOptionalAuth } from '@/components/auth/auth-provider';
import { Avatar, AvatarFallback, AvatarImage, initialsOf } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { profileHref } from './nav-routes';
import type { ShellUser } from './types';

type AccountMenuProps = {
  user: ShellUser;
  /** `full`: avatar + ad (xl sol menü); `compact`: yalnızca avatar (ray, mobil üst bar) */
  variant: 'full' | 'compact';
  className?: string;
};

/** Hesap menüsü: profil ve çıkış. Çıkış tüm cihazlardan çıkış yapar (K8). */
export const AccountMenu = ({ user, variant, className }: AccountMenuProps): ReactElement => {
  const t = useTranslations();
  const auth = useOptionalAuth();
  const signingOut = auth?.pending === 'signing-out';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid='account-menu-trigger'
        aria-label={t('auth.accountMenu.label', { name: user.displayName })}
        className={cn(
          'flex min-h-hit min-w-hit items-center justify-center gap-3 rounded-full p-1 hover:bg-bg-muted',
          variant === 'full' && 'xl:w-full xl:justify-start xl:px-3',
          className
        )}
      >
        <Avatar data-testid='viewer-avatar' className={variant === 'full' ? 'size-10' : 'size-8'}>
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt='' /> : null}
          <AvatarFallback>{initialsOf(user.displayName)}</AvatarFallback>
        </Avatar>
        {variant === 'full' ? (
          <span aria-hidden='true' className='hidden min-w-0 flex-col text-left xl:flex'>
            <span className='truncate text-sm font-semibold text-fg'>{user.displayName}</span>
            <span className='truncate text-xs text-fg-subtle'>{`@${user.username}`}</span>
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-56'>
        <DropdownMenuLabel className='flex flex-col'>
          <span className='truncate text-sm font-semibold text-fg'>{user.displayName}</span>
          <span className='truncate text-xs font-normal text-fg-subtle'>{`@${user.username}`}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={profileHref(user.username)}>
            <CircleUser aria-hidden='true' />
            {t('shell.nav.profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid='sign-out'
          disabled={signingOut || !auth}
          onSelect={() => void auth?.signOut()}
        >
          <LogOut aria-hidden='true' />
          {signingOut ? t('auth.signOut.pending') : t('auth.signOut.action')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
