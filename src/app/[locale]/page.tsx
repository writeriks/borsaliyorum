import NextLink from 'next/link';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { LandingIntro } from '@/features/landing/components/landing-intro';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type HomePageProps = { params: Promise<{ locale: string }> };

const HomePage = async ({ params }: HomePageProps): Promise<ReactElement> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  const otherLocale = locale === 'tr' ? 'en' : 'tr';

  // Oturum S5'te gelir; o zamana kadar viewer `unknown` (AppShell varsayılanı) → giriş UI'ı yok
  return (
    <AppShell>
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
