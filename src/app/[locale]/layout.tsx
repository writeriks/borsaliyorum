import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement, ReactNode } from 'react';

import { Providers } from '@/components/providers';
import { routing } from '@/i18n/routing';
import { getSession } from '@/lib/auth/session';
import { toClientSession } from '@/lib/auth/types';

import '../globals.css';

// Türkçe ğ Ğ ş Ş ı İ Latin Extended-A'da: yalnızca `latin` yüklenirse fallback fonttan gelir
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  // Tarayıcı kontrolleri (kaydırma çubuğu, form) temaya uysun; asıl renkler token'lardan
  colorScheme: 'dark light',
  viewportFit: 'cover',
};

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
  // Oturum sunucuda, istek başına bir kez çözülür; ilk HTML doğru durumla gelir (flash yok)
  const session = toClientSession(await getSession());

  return (
    // suppressHydrationWarning: next-themes tema sınıfını hidrasyondan önce <html>'e yazar
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className='min-h-dvh antialiased'>
        <NextIntlClientProvider>
          <Providers session={session}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
