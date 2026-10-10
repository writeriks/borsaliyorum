/**
 * Kayıtta gösterilen yasal metinlerin sürümleri (legal L3). Metin değişince sürüm artırılır;
 * `User.noticeVersion` ve `ConsentEvent.textVersion` hangi metnin gösterildiğini ispatlar.
 * Metinlerin kendisi legal-advisor/avukat onayından geçmelidir (bkz. teslim raporu).
 */
export const PRIVACY_NOTICE_VERSION = '2026-10-v1';
export const MARKETING_CONSENT_TEXT_VERSION = '2026-10-v1';

/** Aydınlatma metninin yolu (footer ile aynı). Sayfa ayrı dilimde yayımlanacak. */
export const PRIVACY_NOTICE_HREF = '/yasal/kvkk';
