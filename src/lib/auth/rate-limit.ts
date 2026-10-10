/**
 * Auth uçlarının rate limit bağlantı noktası. Gerçek uygulama S9/S10'un `lib/rate-limit`'i
 * (Postgres `RateLimitBucket`) birleşince buraya bağlanır; o zamana kadar her isteğe izin
 * verir. Firebase Auth'un kendi kaba kuvvet koruması (`auth/too-many-requests`) devrededir.
 *
 * TAKİP: `lib/rate-limit` geldiğinde `auth.session:ip:<ip>` için ör. 20/dk, onboarding
 * kullanıcı adı kontrolü için 30/dk sınırı bağlanmalı.
 */
export type RateLimitDecision =
  { readonly ok: true } | { readonly ok: false; readonly retryAfterSeconds: number };

export type RateLimiter = (key: string) => Promise<RateLimitDecision>;

export const authRateLimiter: RateLimiter = async () => ({ ok: true });
