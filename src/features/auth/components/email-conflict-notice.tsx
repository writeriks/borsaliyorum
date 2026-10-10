import { MailWarning } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';

/**
 * v1 kararı: aynı e-postayla kayıtlı farklı Firebase kimliği otomatik birleştirilmez. Kullanıcı
 * takılı bir form yerine ne olduğunu ve ne yapabileceğini görür (diğer yöntemle giriş ya da
 * destek). Onboarding sayfasında ve formun `ACCOUNT_EMAIL_CONFLICT` yanıtında kullanılır.
 */
export const EmailConflictNotice = ({ email }: { email: string }): ReactElement => {
  const t = useTranslations('auth.onboarding.emailConflict');
  const supportLink = (chunks: ReactNode): ReactElement => (
    <a href={SUPPORT_MAILTO} className='font-medium text-accent underline underline-offset-2'>
      {chunks}
    </a>
  );
  return (
    <section
      role='alert'
      aria-labelledby='email-conflict-title'
      data-testid='email-conflict-notice'
      className='flex flex-col gap-3 rounded-md border border-warn/40 bg-bg-subtle px-4 py-4'
    >
      <div className='flex items-start gap-3'>
        <MailWarning aria-hidden='true' className='mt-1 size-5 shrink-0 text-warn' />
        <div className='flex flex-col gap-2'>
          <h2 id='email-conflict-title' className='text-sm font-semibold text-fg'>
            {t('title')}
          </h2>
          <p className='text-sm text-fg-muted'>{t('body', { email })}</p>
          <p className='text-sm text-fg'>
            {t.rich('contact', { supportEmail: SUPPORT_EMAIL, link: supportLink })}
          </p>
        </div>
      </div>
    </section>
  );
};
