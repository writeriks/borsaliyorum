/**
 * v1 URL'lerinden v2'ye kalıcı yönlendirmeler (K7, ADR-0001 cutover adım 3). `next.config.ts`
 * `redirects()` bunları proxy'den (i18n) **önce** uygular. v1'de dil öneki zorunluydu
 * (`/tr/posts/1`); öneksiz biçim de eski paylaşımlarda geçtiği için karşılanır. Yalnızca sayısal
 * kimlik eşleşir: başka biçim 404'e düşer (kimlik doğrulaması detay sayfasında ayrıca var).
 *
 * `statusCode: 301` bilinçli: Next'in `permanent: true`'su 308 üretir; eski linklerin arama motoru
 * ve paylaşım önbelleklerindeki karşılığı 301 (K7). M1'de yalnızca gönderi detayı; diğer v1
 * yolları (`/tr/feed`, `/tr/users/:u`, `/tr/stocks/:t`, `/tr/tags/:t`) hedef sayfalar geldikçe
 * bu listeye eklenir.
 */
export type LegacyRedirect = {
  readonly source: string;
  readonly destination: string;
  readonly statusCode: 301;
};

const ID = ':id(\\d{1,10})';

export const LEGACY_REDIRECTS: readonly LegacyRedirect[] = [
  { source: `/posts/${ID}`, destination: '/gonderi/:id', statusCode: 301 },
  { source: `/tr/posts/${ID}`, destination: '/gonderi/:id', statusCode: 301 },
  { source: `/en/posts/${ID}`, destination: '/en/gonderi/:id', statusCode: 301 },
];
