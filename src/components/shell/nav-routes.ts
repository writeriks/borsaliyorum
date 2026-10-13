/**
 * Kabuk navigasyon hedefleri (K7: Türkçe URL'ler). Sayfaların çoğu sonraki dilimlerde gelir;
 * o zamana kadar yerelleştirilmiş 404'e düşer.
 */
export const NAV_HREF = {
  feed: '/akis',
  explore: '/kesfet',
  compose: '/paylas',
  notifications: '/bildirimler',
  settings: '/ayarlar',
  search: '/ara',
  login: '/giris',
  signup: '/kayit',
  onboarding: '/hos-geldin',
} as const;

export const profileHref = (username: string): string => `/u/${encodeURIComponent(username)}`;
