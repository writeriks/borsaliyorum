import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';

import ReduxProvider from '../../components/redux-provider/redux-provider';
import ClientQueryProvider from '@/components/tanstack-provider/tanstack-provider';
import { ThemeProvider } from '@/components/theme-provider/theme-provider';
import MainLayout from '@/components/main-layout/main-layout';

import '../globals.css';

export const metadata: Metadata = {
  title: 'Türk Borsa ve Yatırım Sosyal Medya Platformu',
  description:
    "Türkiye'nin lider borsa sosyal medya platformu ile hisse senetleri, kripto paralar ve diğer yatırım araçları hakkında bilgi alışverişinde bulunun. Analizler, haberler ve yatırım stratejileri ile portföyünüzü güçlendirin.",
  keywords: ['borsa', 'hisse senetleri', 'kripto paralar', 'yatırım', 'analiz', 'haber', 'portföy'],
};

const RootLayout = async ({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}): Promise<JSX.Element> => {
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className='min-h-screen flex flex-col lg:flex-row'>
        <NextIntlClientProvider messages={messages}>
          <ClientQueryProvider>
            <ReduxProvider>
              <ThemeProvider
                attribute='class'
                defaultTheme='dark'
                enableSystem
                disableTransitionOnChange
              >
                <MainLayout>{children}</MainLayout>
              </ThemeProvider>
            </ReduxProvider>
          </ClientQueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
