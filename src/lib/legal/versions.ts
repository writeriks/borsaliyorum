/**
 * Yasal metinlerin sürümleri ve adresleri: TEK KAYNAK. Sayfalar (`/yasal/*`) sürümü buradan
 * gösterir; kayıt kanıtı (`User.noticeVersion`, `User.termsVersion`, `ConsentEvent.textVersion`)
 * hangi metnin gösterildiğini buradan yazar. Metin değişince ilgili sürüm artırılır ve
 * `docs/legal/README.md`'deki onay tablosu güncellenir.
 */

/** KVKK Aydınlatma Metni (`User.noticeVersion`). */
export const PRIVACY_NOTICE_VERSION = '2026-10-v1';
/** Kullanım Koşulları (`User.termsVersion`). */
export const TERMS_VERSION = '2026-10-v1';
export const COOKIE_POLICY_VERSION = '2026-10-v1';
export const INVESTMENT_DISCLAIMER_VERSION = '2026-10-v1';
export const COMMUNITY_RULES_VERSION = '2026-10-v1';
/**
 * Pazarlama izni kutusunun metni (`ConsentEvent.textVersion`). v2: gönderen ve kanal açıkça
 * yazıldı (docs/legal/auth-metinleri.md, değerlendirme 4).
 */
export const MARKETING_CONSENT_TEXT_VERSION = '2026-10-v2';

/** Yürürlük tarihi (ISO, Europe/Istanbul). Sürümle birlikte değişir. */
export const LEGAL_EFFECTIVE_DATE = '2026-10-10';

/** Yasal sayfaların yolu (yerel öneksiz; `@/i18n/navigation` Link'i öneki ekler). */
export const LEGAL_HREF = {
  privacy: '/yasal/kvkk',
  cookies: '/yasal/cerez-politikasi',
  terms: '/yasal/kullanim-kosullari',
  disclaimer: '/yasal/yatirim-uyarisi',
  community: '/yasal/topluluk-kurallari',
} as const;

export type LegalDocumentKey = keyof typeof LEGAL_HREF;

export const PRIVACY_NOTICE_HREF = LEGAL_HREF.privacy;
export const TERMS_HREF = LEGAL_HREF.terms;

type LegalDocumentEntry = {
  readonly key: LegalDocumentKey;
  /** `/yasal/<slug>` */
  readonly slug: string;
  readonly version: string;
};

/** Footer sırası da budur. */
export const LEGAL_DOCUMENTS = [
  { key: 'disclaimer', slug: 'yatirim-uyarisi', version: INVESTMENT_DISCLAIMER_VERSION },
  { key: 'privacy', slug: 'kvkk', version: PRIVACY_NOTICE_VERSION },
  { key: 'cookies', slug: 'cerez-politikasi', version: COOKIE_POLICY_VERSION },
  { key: 'terms', slug: 'kullanim-kosullari', version: TERMS_VERSION },
  { key: 'community', slug: 'topluluk-kurallari', version: COMMUNITY_RULES_VERSION },
] as const satisfies readonly LegalDocumentEntry[];

export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

export const findLegalDocument = (slug: string): LegalDocument | undefined =>
  LEGAL_DOCUMENTS.find(doc => doc.slug === slug);
