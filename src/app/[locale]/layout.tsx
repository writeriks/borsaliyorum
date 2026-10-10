import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement, ReactNode } from 'react';

import { routing } from '@/i18n/routing';

import '../globals.css';

type LocaleParams = { params: Promise<{ locale: string }> };

export const generateStaticParams = (): { locale: string }[] =>
  routing.locales.map(locale => ({ locale }));

export const generateMetadata = async ({ params }: LocaleParams): Promise<Metadata> => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return { title: t('title'), description: t('description') };
};

const LocaleLayout = async ({
  children,
  params,
}: LocaleParams & { children: ReactNode }): Promise<ReactElement> => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body className='min-h-dvh antialiased'>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
