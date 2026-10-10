import { render, type RenderResult } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';

import en from '../../messages/en.json';
import tr from '../../messages/tr.json';

export const MESSAGES = { tr, en } as const;
export type TestLocale = keyof typeof MESSAGES;

/** Bileşeni gerçek mesaj kataloğu + Radix sağlayıcılarıyla render eder. */
export const renderWithIntl = (ui: ReactNode, locale: TestLocale = 'tr'): RenderResult =>
  render(ui, {
    wrapper: ({ children }: { children: ReactNode }): ReactElement => (
      <NextIntlClientProvider
        locale={locale}
        messages={MESSAGES[locale]}
        timeZone='Europe/Istanbul'
      >
        <TooltipProvider>{children}</TooltipProvider>
      </NextIntlClientProvider>
    ),
  });
