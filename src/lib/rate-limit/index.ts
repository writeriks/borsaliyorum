import 'server-only';

import type { PrismaClient } from '@/lib/db';

/**
 * Postgres'te sabit pencereli sayaç (`RateLimitBucket`). Tek atomik
 * `INSERT … ON CONFLICT DO UPDATE` ile artırılır; eşzamanlı isteklerde sayım kaybolmaz.
 * Serverless'ta süreç içi sayaç işe yaramadığı için DB kullanılır.
 */

export type RateLimitRule = {
  /** ör. `link-preview:u:42`; en fazla 120 karakter (sütun sınırı). */
  readonly key: string;
  readonly limit: number;
  readonly windowMs: number;
};

export type RateLimitResult =
  | { readonly allowed: true; readonly remaining: number }
  | { readonly allowed: false; readonly retryAfterSeconds: number };

export const consumeRateLimit = async (
  db: PrismaClient,
  rule: RateLimitRule,
  now: Date = new Date()
): Promise<RateLimitResult> => {
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
