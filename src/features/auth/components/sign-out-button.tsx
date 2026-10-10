'use client';

import type { ReactElement } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';

/** Metni verilen çıkış butonu (ör. onboarding'de "Farklı bir hesapla gir"). */
export const SignOutButton = ({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}): ReactElement => {
  const { pending, signOut } = useAuth();
  const signingOut = pending === 'signing-out';
  return (
    <Button
      type='button'
      variant='ghost'
      size='md'
      loading={signingOut}
      disabled={signingOut}
      onClick={() => void signOut()}
      className='self-start'
    >
      {signingOut ? pendingLabel : label}
    </Button>
  );
};
