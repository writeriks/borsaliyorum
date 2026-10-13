'use client';

import type { ReactElement } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

import { AccountMenu } from './account-menu';
import type { ShellViewer } from './types';
import { useShellViewer } from './use-shell-viewer';

/**
 * Mobil üst bardaki hesap menüsü (çıkış buradan). Anonimde boş: giriş/kayıt alt bantta.
 * Auth bilinmiyorsa aynı ölçüde skeleton.
 */
export const TopBarAccount = ({
  viewer: serverViewer,
}: {
  viewer: ShellViewer;
}): ReactElement | null => {
  const viewer = useShellViewer(serverViewer);
  if (viewer.status === 'unknown') {
    return (
      <span
        aria-hidden='true'
        data-testid='top-bar-account-skeleton'
        className='flex size-hit items-center justify-center'
      >
        <Skeleton className='size-8 rounded-full' />
      </span>
    );
  }
  // Anonim / onboarding eksik: giriş ya da "Kaydı tamamla" alt bantta
  if (viewer.status !== 'authenticated') return null;
  return <AccountMenu user={viewer.user} variant='compact' />;
};
