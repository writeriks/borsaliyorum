/**
 * Yasal metinlerin sürümleri ve adresleri: TEK KAYNAK. Sayfalar (`/yasal/*`) sürümü buradan
 * gösterir; kayıt kanıtı (`User.noticeVersion`, `User.termsVersion`, `User.legalBundleVersion`,
 * `ConsentEvent.textVersion`) hangi metnin gösterildiğini buradan yazar. Metin değişince ilgili
 * sürüm ve yürürlük tarihi artırılır ve `docs/legal/README.md`'deki onay tablosu güncellenir.
 */

/** KVKK Aydınlatma Metni (`User.noticeVersion`). v2: legal review (yurt dışı, saklama, başvuru). */
export const PRIVACY_NOTICE_VERSION = '2026-10-v2';
/** Kullanım Koşulları (`User.termsVersion`). v2: uyuşmazlık, değişiklik, 5651, sponsorlu içerik. */
export const TERMS_VERSION = '2026-10-v2';
/** v2: tema ve taslaklar "Zorunlu (istediğin işlev için)". */
export const COOKIE_POLICY_VERSION = '2026-10-v2';
export const INVESTMENT_DISCLAIMER_VERSION = '2026-10-v1';
/** v2: içsel bilgiyle işlem, ihlal bildirimi ve 24 saat taahhüdü. */
export const COMMUNITY_RULES_VERSION = '2026-10-v2';
/**
 * Pazarlama izni kutusunun metni (`ConsentEvent.textVersion`). v2: gönderen ve kanal açıkça
 * yazıldı (docs/legal/auth-metinleri.md, değerlendirme 4).
 */
export const MARKETING_CONSENT_TEXT_VERSION = '2026-10-v2';

/**
 * Kabul edilmesi gereken yasal metin paketi (Koşullar + Topluluk Kuralları + Yatırım Uyarısı;
 * `User.legalBundleVersion`). YALNIZCA aleyhe önemli bir değişiklikte artırılır: artınca girişli
 * her kullanıcı /yasal/yeni-surum'da yeniden kabul edene kadar yazamaz (okuma serbest). Lehe ya
 * da kanundan doğan değişikliklerde belge sürümü artar, paket sürümü artmaz (Koşullar
 * "Koşullardaki değişiklikler"). Aleyhe değişiklik en az 30 gün önce duyurulur.
 */
export const LEGAL_BUNDLE_VERSION = '2026-10-v1';

/** Kabul anında kaydedilen belge sürümleri (ispat: hangi metinler kabul edildi). */
export const LEGAL_BUNDLE_DOCUMENT_VERSIONS = {
  termsVersion: TERMS_VERSION,
  communityRulesVersion: COMMUNITY_RULES_VERSION,
  disclaimerVersion: INVESTMENT_DISCLAIMER_VERSION,
} as const;

/** Kullanıcının kabul ettiği paket güncel değilse yeniden kabul gerekir. */
export const needsLegalAcceptance = (acceptedBundleVersion: string | null): boolean =>
  acceptedBundleVersion !== LEGAL_BUNDLE_VERSION;

/** Yasal sayfaların yolu (yerel öneksiz; `@/i18n/navigation` Link'i öneki ekler). */
export const LEGAL_HREF = {
  privacy: '/yasal/kvkk',
  cookies: '/yasal/cerez-politikasi',
  terms: '/yasal/kullanim-kosullari',
  disclaimer: '/yasal/yatirim-uyarisi',
  community: '/yasal/topluluk-kurallari',
} as const;

/** Yeni sürümü kabul ekranı (girişli kullanıcı; paket sürümü değişince). */
export const LEGAL_ACCEPTANCE_HREF = '/yasal/yeni-surum';

export type LegalDocumentKey = keyof typeof LEGAL_HREF;

export const PRIVACY_NOTICE_HREF = LEGAL_HREF.privacy;
export const TERMS_HREF = LEGAL_HREF.terms;

type LegalDocumentEntry = {
  readonly key: LegalDocumentKey;
  /** `/yasal/<slug>` */
  readonly slug: string;
  readonly version: string;
  /** Yürürlük tarihi (ISO, Europe/Istanbul). Sürümle birlikte değişir. */
  readonly effectiveDate: string;
};

/** Footer sırası da budur. */
export const LEGAL_DOCUMENTS = [
  {
    key: 'disclaimer',
    slug: 'yatirim-uyarisi',
    version: INVESTMENT_DISCLAIMER_VERSION,
    effectiveDate: '2026-10-10',
  },
  { key: 'privacy', slug: 'kvkk', version: PRIVACY_NOTICE_VERSION, effectiveDate: '2026-10-11' },
  {
    key: 'cookies',
    slug: 'cerez-politikasi',
    version: COOKIE_POLICY_VERSION,
    effectiveDate: '2026-10-11',
  },
  {
    key: 'terms',
    slug: 'kullanim-kosullari',
    version: TERMS_VERSION,
    effectiveDate: '2026-10-11',
  },
  {
    key: 'community',
    slug: 'topluluk-kurallari',
    version: COMMUNITY_RULES_VERSION,
    effectiveDate: '2026-10-11',
  },
] as const satisfies readonly LegalDocumentEntry[];

export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

export const findLegalDocument = (slug: string): LegalDocument | undefined =>
  LEGAL_DOCUMENTS.find(doc => doc.slug === slug);
