'use client';

import { MailWarning } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactElement, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';

import { resendVerificationEmail } from '../client/auth-flows';
import { createVerificationToken, refreshEmailVerification } from '../server/actions';

type Busy = 'resend' | 'check' | null;

/**
 * Doğrulanmamış e-posta bandı: okuyabilir, yazamaz (flag `emailVerified`). Doğrulama
 * bağlantısını yeniden gönderme ve "Doğruladım" (Firebase'den tazeleme) aksiyonları.
 */
export const EmailVerificationNotice = (): ReactElement | null => {
  const t = useTranslations('auth.verify');
  const locale = useLocale();
  const router = useRouter();
  const { session } = useAuth();
  const [busy, setBusy] = useState<Busy>(null);

  if (session.status !== 'authenticated' || session.user.emailVerified) return null;

  const resend = async (): Promise<void> => {
    setBusy('resend');
    try {
      const token = await createVerificationToken();
      const sent = token.ok ? await resendVerificationEmail(locale, token.data.token) : null;
      if (sent?.ok) toast.success(t('resent'));
      else toast.error(t('resendFailed'));
    } finally {
      setBusy(null);
    }
  };

  const check = async (): Promise<void> => {
    setBusy('check');
    try {
      const result = await refreshEmailVerification();
      if (result.ok && result.data.verified) {
        toast.success(t('verified'));
        router.refresh();
      } else {
        toast.error(t('stillUnverified'));
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      aria-labelledby='verify-email-title'
      data-testid='email-verification-notice'
      className='flex flex-col gap-3 border-b border-border bg-bg-subtle px-4 py-4'
    >
      <div className='flex items-start gap-3'>
        <MailWarning aria-hidden='true' className='mt-1 size-5 shrink-0 text-warn' />
        <div className='flex flex-col gap-1'>
          <h2 id='verify-email-title' className='text-sm font-semibold text-fg'>
            {t('title')}
          </h2>
          <p className='text-sm text-fg-muted'>{t('body', { email: session.user.email })}</p>
        </div>
      </div>
      <div className='flex flex-wrap gap-2 pl-8'>
        <Button
          variant='outline'
          size='md'
          loading={busy === 'resend'}
          disabled={busy !== null}
          onClick={() => void resend()}
        >
          {busy === 'resend' ? t('resending') : t('resend')}
        </Button>
        <Button
          variant='ghost'
          size='md'
          loading={busy === 'check'}
          disabled={busy !== null}
          onClick={() => void check()}
        >
          {busy === 'check' ? t('checking') : t('check')}
        </Button>
      </div>
    </section>
  );
};
