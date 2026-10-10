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
      <span aria-hidden='true' className='flex size-hit items-center justify-center'>
        <Skeleton className='size-8 rounded-full' />
      </span>
    );
  }
  if (viewer.status === 'anonymous') return null;
  return <AccountMenu user={viewer.user} variant='compact' />;
};
