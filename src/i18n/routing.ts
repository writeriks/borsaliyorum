import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['tr', 'en'],
  defaultLocale: 'tr',
  // tr öneksiz (`/akis`), en `/en/...`
  localePrefix: 'as-needed',
  // Dil, Accept-Language'a göre tahmin edilmez ve çerezde saklanmaz: URL tek kaynak.
  // (Yeni çerez = KVKK incelemesi; otomatik /en yönlendirmesi Türkçe ziyaretçiyi şaşırtır.)
  localeDetection: false,
  localeCookie: false,
});

export type Locale = (typeof routing.locales)[number];
