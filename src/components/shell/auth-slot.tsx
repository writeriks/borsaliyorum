'use client';

import { LogIn, UserRoundCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';

import { AccountMenu } from './account-menu';
import { NAV_HREF } from './nav-routes';
import type { ShellViewer } from './types';
import { useShellViewer } from './use-shell-viewer';

/**
 * Sol menünün altındaki kullanıcı alanı. `unknown` → aynı ölçüde skeleton; "Giriş yap"
 * yalnızca sunucu `anonymous` dediğinde (auth-session UX kuralı 1); onboarding'i bitmemiş
 * hesap "Kaydı tamamla" görür.
 */
export const AuthSlot = ({ viewer: serverViewer }: { viewer: ShellViewer }): ReactElement => {
  const t = useTranslations();
  const viewer = useShellViewer(serverViewer);

  if (viewer.status === 'unknown') {
    return (
      <div
        data-testid='auth-slot-skeleton'
        aria-busy='true'
        className='flex min-h-hit items-center justify-center gap-3 xl:justify-start xl:px-3'
      >
        <span className='sr-only'>{t('shell.accountLoading')}</span>
        <Skeleton className='size-10 shrink-0 rounded-full' />
        <div className='hidden flex-1 flex-col gap-2 xl:flex'>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-3 w-20' />
        </div>
      </div>
    );
  }

  if (viewer.status === 'needs-onboarding') {
    return (
      <div className='flex flex-col items-center gap-2 xl:items-stretch'>
        <Button asChild size='lg' className='hidden xl:inline-flex'>
          <Link href={NAV_HREF.onboarding} data-testid='complete-signup-cta'>
            {t('shell.completeSignup')}
          </Link>
        </Button>
        <Button asChild variant='ghost' size='icon' className='xl:hidden'>
          <Link
            href={NAV_HREF.onboarding}
            aria-label={t('shell.completeSignup')}
            data-testid='complete-signup-cta'
          >
            <UserRoundCheck aria-hidden='true' />
          </Link>
        </Button>
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
          <Link href={NAV_HREF.login} data-testid='login-cta'>
            {t('common.login')}
          </Link>
        </Button>
        <Button asChild variant='ghost' size='icon' className='xl:hidden'>
          <Link href={NAV_HREF.login} aria-label={t('common.login')} data-testid='login-cta'>
            <LogIn aria-hidden='true' />
          </Link>
        </Button>
      </div>
    );
  }

  return <AccountMenu user={viewer.user} variant='full' />;
};
