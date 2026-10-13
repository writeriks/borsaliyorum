import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { AuthPageFrame, firstParam } from '@/features/auth/components/auth-page-frame';
import { CredentialsForm } from '@/features/auth/components/credentials-form';
import { REVERIFY_PARAM } from '@/features/auth/constants';
import { Link } from '@/i18n/navigation';
import { type AuthPageProps, resolveLocale } from '@/i18n/page-params';
import { safeNextPath } from '@/lib/auth/rules';
import { canReverifyEmail, redirectIfSignedIn } from '@/lib/auth/session';

export const generateMetadata = async ({
  params,
  searchParams,
}: AuthPageProps): Promise<Metadata> => {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale });
  const reverify = firstParam((await searchParams)[REVERIFY_PARAM]) === '1';
  const title = reverify ? t('auth.reverify.metaTitle') : t('auth.login.metaTitle');
  return { title: `${title} · ${t('metadata.title')}` };
};

const LoginPage = async ({ params, searchParams }: AuthPageProps): Promise<ReactElement> => {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const query = await searchParams;
  const next = safeNextPath(firstParam(query.next));
  // Doğrulama bağlantısı için yeniden giriş: yalnızca girişli + doğrulanmamış kullanıcı
  const reverify = firstParam(query[REVERIFY_PARAM]) === '1' && (await canReverifyEmail());
  if (!reverify) await redirectIfSignedIn(next);
  const t = await getTranslations({ locale, namespace: 'auth' });

  if (reverify) {
    return (
      <AppShell viewer={{ status: 'unknown' }}>
        <AuthPageFrame title={t('reverify.title')} lead={t('reverify.lead')}>
          <CredentialsForm mode='reverify' next={next} />
        </AuthPageFrame>
      </AppShell>
    );
  }

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
