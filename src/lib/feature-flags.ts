type EnvSource = Readonly<Record<string, string | undefined>>;

const isOn = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true';

/**
 * Onboarding'deki pazarlama izni kutusu (6563 / İYS). Varsayılan KAPALI: İYS'ye 3 iş günü
 * içinde yükleme ve ret akışı hazır olmadan toplanan onay sonradan kullanılamaz
 * (docs/legal/auth-metinleri.md, değerlendirme 4). Yalnızca tam olarak `true` açar.
 *
 * Saf fonksiyon; sunucu erişimcisi `getMarketingConsentEnabled()` (`lib/env.server.ts`).
 */
export const isMarketingConsentEnabled = (env: EnvSource): boolean =>
  isOn(env.MARKETING_CONSENT_ENABLED);
