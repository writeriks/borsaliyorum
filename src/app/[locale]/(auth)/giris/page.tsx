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
  return { title: `${t('auth.login.metaTitle')} · ${t('metadata.title')}` };
};

const LoginPage = async ({ params, searchParams }: AuthPageProps): Promise<ReactElement> => {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const next = safeNextPath(firstParam((await searchParams).next));
  await redirectIfSignedIn(next);
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <AppShell viewer={{ status: 'anonymous' }}>
      <AuthPageFrame
        title={t('login.title')}
        lead={t('login.lead')}
        footer={
          <p>
            {t('login.noAccount')}{' '}
            <Link
              href={next ? { pathname: '/kayit', query: { next } } : '/kayit'}
              className='font-medium text-accent underline-offset-2 hover:underline'
            >
              {t('login.signupLink')}
            </Link>
          </p>
        }
      >
        <CredentialsForm mode='login' next={next} />
      </AuthPageFrame>
    </AppShell>
  );
};

export default LoginPage;
