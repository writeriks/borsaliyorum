import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { AuthPageFrame, firstParam } from '@/features/auth/components/auth-page-frame';
import { CredentialsForm } from '@/features/auth/components/credentials-form';
import { Link } from '@/i18n/navigation';
import { type AuthPageProps, resolveLocale } from '@/i18n/page-params';
import { safeNextPath } from '@/lib/auth/rules';
import { redirectIfSignedIn } from '@/lib/auth/session';

export const generateMetadata = async ({ params }: AuthPageProps): Promise<Metadata> => {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale });
  return { title: `${t('auth.signup.metaTitle')} · ${t('metadata.title')}` };
};

const SignupPage = async ({ params, searchParams }: AuthPageProps): Promise<ReactElement> => {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const next = safeNextPath(firstParam((await searchParams).next));
  await redirectIfSignedIn(next);
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <AppShell viewer={{ status: 'anonymous' }}>
      <AuthPageFrame
        title={t('signup.title')}
        lead={t('signup.lead')}
        footer={
          <p>
            {t('signup.haveAccount')}{' '}
            <Link
              href={next ? { pathname: '/giris', query: { next } } : '/giris'}
              className='font-medium text-accent underline-offset-2 hover:underline'
            >
              {t('signup.loginLink')}
            </Link>
          </p>
        }
      >
        <CredentialsForm mode='signup' next={next} />
      </AuthPageFrame>
    </AppShell>
  );
};

export default SignupPage;
