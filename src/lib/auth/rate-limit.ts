import 'server-only';

import { getIpEncryptionKey } from '@/lib/crypto/key';
import { getDb, type Prisma } from '@/lib/db';
import { consumeRateLimit } from '@/lib/rate-limit';

import {
  type AuthRateLimitName,
  authRateLimitRule,
  IP_BUCKET_KEY_LIKE,
  IP_BUCKET_RETENTION_HOURS,
  isIpRule,
  type RateLimitDecision,
} from './rate-limit-keys';

export type { RateLimitDecision };

export type AuthRateLimitDb = Pick<Prisma.TransactionClient, '$queryRaw' | '$executeRaw'>;

export type AuthRateLimitDeps = {
  readonly db: AuthRateLimitDb;
  readonly secret: Uint8Array;
  readonly now: Date;
};

/**
 * IP anahtarlı kovaların saklama sınırı (≤ 24 saat, legal kararı). Günlük purge script'i
 * (`lib/db/retention.ts`) de aynı sınırı uygular; burada her IP'li tüketimde fırsatçı olarak
 * silinir ki trafik varken satır 24 saati aşmasın. Auth uçları düşük frekanslıdır; ifade
 * `windowStart` index'ini kullanır.
 */
export const purgeStaleIpBuckets = async (db: AuthRateLimitDb, now: Date): Promise<number> => {
  const cutoff = new Date(now.getTime() - IP_BUCKET_RETENTION_HOURS * 60 * 60 * 1000);
  return db.$executeRaw`
    DELETE FROM "RateLimitBucket"
    WHERE "windowStart" < ${cutoff} AND "key" LIKE ${IP_BUCKET_KEY_LIKE}`;
};

/** Saf çekirdek (integration testli): kuralı uygular, IP'li ise eski IP kovalarını temizler. */
export const consumeAuthRateLimitWith = async (
  name: AuthRateLimitName,
  subject: string | null,
  deps: AuthRateLimitDeps
): Promise<RateLimitDecision> => {
  const result = await consumeRateLimit(
    deps.db,
    authRateLimitRule(name, subject, deps.secret),
    deps.now
  );
  if (isIpRule(name)) await purgeStaleIpBuckets(deps.db, deps.now);
  return result.allowed ? { ok: true } : { ok: false, retryAfterSeconds: result.retryAfterSeconds };
};

/**
 * Auth uçlarının rate limit'i (`AUTH_RATE_LIMITS`). Firebase Auth'un kendi kaba kuvvet koruması
 * (`auth/too-many-requests`) ayrıca devrededir.
 */
export const consumeAuthRateLimit = (
  name: AuthRateLimitName,
  subject: string | null
): Promise<RateLimitDecision> =>
  consumeAuthRateLimitWith(name, subject, {
    db: getDb(),
    secret: getIpEncryptionKey(),
    now: new Date(),
  });
