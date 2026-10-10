import { createHmac, hkdfSync } from 'node:crypto';

import { RATE_LIMIT_IP_KEY_LIKE, RATE_LIMIT_IP_RETENTION_HOURS } from '@/lib/db/retention';
import type { RateLimitRule } from '@/lib/rate-limit';

/**
 * Auth uçlarının rate limit kuralları (Postgres `RateLimitBucket`, `lib/rate-limit`). Saf
 * modül: anahtar üretimi unit testlidir, DB'ye dokunmaz.
 *
 * Anahtarda ham IP ya da Firebase uid **tutulmaz**: `HMAC-SHA256(türetilmiş anahtar, değer)`'in
 * ilk 128 biti. IPv4 uzayı küçük olduğundan düz hash geri çevrilebilirdi; anahtar
 * `IP_ENCRYPTION_KEY`'den HKDF ile ayrı amaçla türetilir (aynı anahtar iki işte kullanılmaz).
 * IP anahtarlı satırlar en geç 24 saatte silinir (legal kararı; `IP_BUCKET_RETENTION_HOURS`).
 */

const MINUTE = 60_000;

export type RateLimitDecision =
  { readonly ok: true } | { readonly ok: false; readonly retryAfterSeconds: number };

export const AUTH_RATE_LIMITS = {
  /** POST /api/auth/session, IP başına (kaba kuvvet / token deneme). */
  'session.ip': { limit: 30, windowMs: 10 * MINUTE },
  /** POST /api/auth/session, Firebase hesabı başına (token doğrulandıktan sonra). */
  'session.uid': { limit: 10, windowMs: 10 * MINUTE },
  /** Doğrulama e-postasını yeniden gönderme, hesap başına. */
  'verify-email.uid': { limit: 5, windowMs: 60 * MINUTE },
  /** Onboarding'deki canlı kullanıcı adı kontrolü (kullanıcı adı numaralandırması). */
  'username-check.uid': { limit: 60, windowMs: MINUTE },
  'username-check.ip': { limit: 120, windowMs: MINUTE },
  /** Onboarding gönderimi, hesap başına. */
  'onboarding.uid': { limit: 10, windowMs: 10 * MINUTE },
} as const satisfies Record<string, Omit<RateLimitRule, 'key'>>;

export type AuthRateLimitName = keyof typeof AUTH_RATE_LIMITS;

/** IP anahtarlı satırların en uzun saklama süresi (legal: ≤ 24 saat). */
export const IP_BUCKET_RETENTION_HOURS = RATE_LIMIT_IP_RETENTION_HOURS;

/** IP anahtarlı kuralların ortak deseni (`auth.<ad>.ip:<hash>`); temizlik bununla seçer. */
export const IP_BUCKET_KEY_LIKE = RATE_LIMIT_IP_KEY_LIKE;

const HKDF_INFO = 'borsaliyorum/rate-limit-subject/v1';
const derivedKeys = new WeakMap<Uint8Array, Buffer>();

const subjectKey = (secret: Uint8Array): Buffer => {
  let key = derivedKeys.get(secret);
  if (!key) {
    key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), HKDF_INFO, 32));
    derivedKeys.set(secret, key);
  }
  return key;
};

/** IP ya da uid'nin anahtarlı özeti (base64url, 22 karakter). */
export const hashRateLimitSubject = (value: string, secret: Uint8Array): string =>
  createHmac('sha256', subjectKey(secret))
    .update(value)
    .digest()
    .subarray(0, 16)
    .toString('base64url');

export const isIpRule = (name: AuthRateLimitName): boolean => name.endsWith('.ip');

/**
 * Kural + özne → `consumeRateLimit` kuralı. IP bilinmiyorsa (`null`) ortak `unknown` kovası:
 * Vercel'de her istekte IP vardır; yerelde başlık yoksa limit yine uygulanır (fail-closed).
 */
export const authRateLimitRule = (
  name: AuthRateLimitName,
  subject: string | null,
  secret: Uint8Array
): RateLimitRule => ({
  key: `auth.${name}:${subject === null ? 'unknown' : hashRateLimitSubject(subject, secret)}`,
  ...AUTH_RATE_LIMITS[name],
});
