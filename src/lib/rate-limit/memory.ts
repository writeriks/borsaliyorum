import type { RateLimitResult } from './index';

/**
 * Süreç içi (instance başına) sabit pencereli sayaç. Yalnızca "best-effort" sınırlar için:
 * autocomplete gibi her tuşta çağrılan, okuma yapan uçlarda DB'ye sayaç yazmak sorgunun
 * kendisinden pahalıdır (ADR-0002 Karar 4). Serverless'ta her instance kendi sayacını tutar;
 * asıl taban koruma Vercel Firewall kuralıdır. Yazma işlemleri Postgres kovasını kullanır.
 *
 * Bellek sınırlıdır: `maxKeys` aşılınca önce süresi dolan pencereler, yetmezse en eski anahtar
 * atılır (çok sayıda farklı IP ile belleği şişirme denemesi süreci düşürmesin).
 */
export type MemoryRateLimiter = {
  consume: (key: string, now?: number) => RateLimitResult;
  /** Testler için: tüm sayaçları siler. */
  reset: () => void;
  readonly size: () => number;
};

export type MemoryRateLimitOptions = {
  readonly limit: number;
  readonly windowMs: number;
  readonly maxKeys?: number;
};

type Bucket = { windowStart: number; count: number };

const DEFAULT_MAX_KEYS = 10_000;

export const createMemoryRateLimiter = ({
  limit,
  windowMs,
  maxKeys = DEFAULT_MAX_KEYS,
}: MemoryRateLimitOptions): MemoryRateLimiter => {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('rate-limit: limit pozitif tam sayı olmalı');
  }
  if (!Number.isInteger(windowMs) || windowMs < 1) {
    throw new RangeError('rate-limit: windowMs pozitif tam sayı olmalı');
  }
  const buckets = new Map<string, Bucket>();

  const evict = (windowStart: number): void => {
    for (const [key, bucket] of buckets) {
      if (bucket.windowStart < windowStart) buckets.delete(key);
    }
    // Map ekleme sırasını korur: ilk anahtar en eski
    while (buckets.size >= maxKeys) {
      const oldest = buckets.keys().next();
      if (oldest.done) break;
      buckets.delete(oldest.value);
    }
  };

  return {
    consume: (key, now = Date.now()) => {
      const windowStart = Math.floor(now / windowMs) * windowMs;
      let bucket = buckets.get(key);
      if (!bucket || bucket.windowStart !== windowStart) {
        if (!bucket && buckets.size >= maxKeys) evict(windowStart);
        // Yeniden ekleme: anahtar sıranın sonuna geçer (en eski = en uzun süredir yenilenmeyen)
        buckets.delete(key);
        bucket = { windowStart, count: 0 };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      if (bucket.count <= limit) return { allowed: true, remaining: limit - bucket.count };
      const retryAfterMs = windowStart + windowMs - now;
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    },
    reset: () => buckets.clear(),
    size: () => buckets.size,
  };
};
