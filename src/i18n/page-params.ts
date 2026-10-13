import { hasLocale } from 'next-intl';

import { type Locale, routing } from '@/i18n/routing';

export type AuthPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const resolveLocale = (raw: string): Locale =>
  hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
