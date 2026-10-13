import NextLink from 'next/link';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { LandingIntro } from '@/features/landing/components/landing-intro';
import { getPathname, redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getSession } from '@/lib/auth/session';

type HomePageProps = { params: Promise<{ locale: string }> };

const HomePage = async ({ params }: HomePageProps): Promise<ReactElement> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  setRequestLocale(locale);
  // Girişli kullanıcı landing'i görmez: yönlendirme sunucuda (auth-session; meta-refresh yok)
  const session = await getSession();
  if (session.status === 'authenticated') redirect({ href: '/akis', locale });
  if (session.status === 'needs-onboarding') redirect({ href: '/hos-geldin', locale });
  const t = await getTranslations({ locale, namespace: 'home' });
  const otherLocale = locale === 'tr' ? 'en' : 'tr';

  return (
    <AppShell viewer={{ status: 'anonymous' }}>
      <div className='flex flex-col gap-6 px-4 py-8 sm:py-12'>
        <LandingIntro />
        {/*
          next-intl'in locale değiştiren Link'i öneki zorlar (/tr) → proxy 307 ile / 'e yönlendirir;
          bu yönlendirme kabuk linklerinin süren prefetch'leriyle yarışıp URL'yi /tr'de bırakabiliyor.
          Dil çerezi kapalı (routing.ts) olduğundan önek gereksiz: doğrudan kanonik adrese git.
        */}
        <NextLink
          href={getPathname({ href: '/', locale: otherLocale })}
          hrefLang={otherLocale}
          aria-label={t('switchLocaleLabel')}
          className='inline-flex min-h-hit min-w-hit items-center self-start text-accent underline underline-offset-4'
        >
          {t('switchLocale')}
        </NextLink>
      </div>
    </AppShell>
  );
};

export default HomePage;
