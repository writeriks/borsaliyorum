import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { Wordmark } from '@/components/shell/wordmark';
import { AuthPageFrame, firstParam } from '@/features/auth/components/auth-page-frame';
import { EmailConflictNotice } from '@/features/auth/components/email-conflict-notice';
import { OnboardingForm } from '@/features/auth/components/onboarding-form';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { emailBelongsToOtherIdentity } from '@/features/auth/server/onboarding';
import { type AuthPageProps, resolveLocale } from '@/i18n/page-params';
import { safeNextPath } from '@/lib/auth/rules';
import { requireOnboardingIdentity } from '@/lib/auth/session';
import { getDb } from '@/lib/db';

export const generateMetadata = async ({ params }: AuthPageProps): Promise<Metadata> => {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale });
  return { title: `${t('auth.onboarding.metaTitle')} · ${t('metadata.title')}` };
};

/**
 * Onboarding (`/hos-geldin`): kimliği doğrulanmış ama kullanıcı adı seçmemiş hesaplar. Kabuk
 * yok: kullanıcı bu adımı bitirmeden uygulamada gezinemez (`requireUser` buraya yönlendirir).
 */
const OnboardingPage = async ({ params, searchParams }: AuthPageProps): Promise<ReactElement> => {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const next = safeNextPath(firstParam((await searchParams).next));
  const identity = await requireOnboardingIdentity(next);
  // E-posta başka bir kimliğin hesabındaysa form gösterilmez: gönderimde hata alıp takılmasın
  const emailConflict =
    identity.existingUserId === null && (await emailBelongsToOtherIdentity(getDb(), identity));
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <main id='icerik' className='flex min-h-dvh flex-col items-center'>
      <div className='flex w-full max-w-100 px-4 pt-6'>
        <Wordmark />
      </div>
      <AuthPageFrame
        title={t('onboarding.title')}
        lead={t('onboarding.lead')}
        footer={
          <>
            <p className='text-xs'>{t('onboarding.signedInAs', { email: identity.email })}</p>
            <SignOutButton
              label={t('onboarding.switchAccount')}
              pendingLabel={t('signOut.pending')}
            />
          </>
        }
      >
        {emailConflict ? (
          <EmailConflictNotice email={identity.email} />
        ) : (
          <OnboardingForm
            email={identity.email}
            suggestedDisplayName={identity.suggestedDisplayName}
            next={next}
          />
        )}
      </AuthPageFrame>
    </main>
  );
};

export default OnboardingPage;
