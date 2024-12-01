import type { Metadata } from 'next';

import ReduxProvider from '../components/redux-provider/redux-provider';
import ClientQueryProvider from '@/components/tanstack-provider/tanstack-provider';
import { ThemeProvider } from '@/components/theme-provider/theme-provider';

import MainLayout from '@/components/main-layout/main-layout';

import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
  title: 'Türk Borsa ve Yatırım Sosyal Medya Platformu',
  description:
    "Türkiye'nin lider borsa sosyal medya platformu ile hisse senetleri, kripto paralar ve diğer yatırım araçları hakkında bilgi alışverişinde bulunun. Analizler, haberler ve yatırım stratejileri ile portföyünüzü güçlendirin.",
  keywords: ['borsa', 'hisse senetleri', 'kripto paralar', 'yatırım', 'analiz', 'haber', 'portföy'],
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode => (
  <html lang='en'>
    <body className='min-h-screen flex flex-col lg:flex-row'>
      <ClientQueryProvider>
        <ReduxProvider>
          <ThemeProvider
            attribute='class'
            defaultTheme='dark'
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <MainLayout>{children}</MainLayout>
            </TooltipProvider>
          </ThemeProvider>
        </ReduxProvider>
      </ClientQueryProvider>
    </body>
  </html>
);

export default RootLayout;
