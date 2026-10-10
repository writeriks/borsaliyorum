import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { LandingIntro } from '@/features/landing/components/landing-intro';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type HomePageProps = { params: Promise<{ locale: string }> };

const HomePage = async ({ params }: HomePageProps): Promise<ReactElement> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  const otherLocale = locale === 'tr' ? 'en' : 'tr';

  return (
    <main className='mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16'>
      <LandingIntro />
      <Link
        href='/'
        locale={otherLocale}
        hrefLang={otherLocale}
        aria-label={t('switchLocaleLabel')}
        className='inline-flex min-h-11 items-center self-start underline underline-offset-4'
      >
        {t('switchLocale')}
      </Link>
    </main>
  );
};

export default HomePage;
