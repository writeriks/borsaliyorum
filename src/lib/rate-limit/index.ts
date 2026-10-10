import 'server-only';

import type { Prisma } from '@/lib/db';

/**
 * Postgres'te sabit pencereli sayaç (`RateLimitBucket`). Tek atomik
 * `INSERT … ON CONFLICT DO UPDATE` ile artırılır; eşzamanlı isteklerde sayım kaybolmaz.
 * Serverless'ta süreç içi sayaç işe yaramadığı için DB kullanılır. Eski pencereler
 * `scripts/purge-retention.ts` ile (en uzun pencere 24 saat + 24 saat pay) silinir.
 */

/** `RateLimitBucket.key` sütun sınırı (`VARCHAR(120)`). */
export const RATE_LIMIT_KEY_MAX_LENGTH = 120;

export type RateLimitRule = {
  /** ör. `link-preview:u:42`; 1–120 karakter. */
  readonly key: string;
  readonly limit: number;
  /** En fazla 24 saat: purge script'i daha uzun pencerelerin sayaçlarını erken siler. */
  readonly windowMs: number;
};

export type RateLimitResult =
  | { readonly allowed: true; readonly remaining: number }
  | { readonly allowed: false; readonly retryAfterSeconds: number };

/** `PrismaClient` ya da `$transaction` içindeki istemci; sayaç çağıranın işlemine katılabilir. */
export type RateLimitDb = Pick<Prisma.TransactionClient, '$queryRaw'>;

const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Programcı hatasıdır (kullanıcı girdisi değil): sessizce kırpmak farklı anahtarları
 * birleştirir, DB'ye bırakmak ise anlaşılmaz bir sürücü hatası verir.
 */
const assertRule = (rule: RateLimitRule): void => {
  if (rule.key.length === 0 || rule.key.length > RATE_LIMIT_KEY_MAX_LENGTH) {
    throw new RangeError(`rate-limit: key 1–${RATE_LIMIT_KEY_MAX_LENGTH} karakter olmalı`);
  }
  if (!Number.isInteger(rule.limit) || rule.limit < 1) {
    throw new RangeError('rate-limit: limit pozitif tam sayı olmalı');
  }
  if (!Number.isInteger(rule.windowMs) || rule.windowMs < 1 || rule.windowMs > MAX_WINDOW_MS) {
    throw new RangeError('rate-limit: windowMs 1 ms – 24 saat olmalı');
  }
};

export const consumeRateLimit = async (
  db: RateLimitDb,
  rule: RateLimitRule,
  now: Date = new Date()
): Promise<RateLimitResult> => {
  assertRule(rule);
  const windowStartMs = Math.floor(now.getTime() / rule.windowMs) * rule.windowMs;
  const windowStart = new Date(windowStartMs);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count")
    VALUES (${rule.key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
    RETURNING "count"`;
  const count = rows[0]?.count ?? 1;
  if (count <= rule.limit) return { allowed: true, remaining: rule.limit - count };
  const retryAfterMs = windowStartMs + rule.windowMs - now.getTime();
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
};
