import 'server-only';

import { ErrorCode, fail, ok, type Result } from '@/lib/errors';
import { consumeRateLimit, type RateLimitDb } from '@/lib/rate-limit';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

type Window = { readonly name: string; readonly limit: number; readonly windowMs: number };

/**
 * Kullanıcı başına yazma sınırları (coding-standards "Mutasyonlarda kullanıcı bazlı rate limit").
 * Gönderi: ADR-0002 Karar 7 (10 / 10 dk, 60 / gün). Diğerleri S10 varsayımı: yorum gönderiden
 * daha sık yazılır; beğeni optimistic bir geçiştir, kısa pencere yeter; silme nadirdir.
 */
export const WRITE_RATE_LIMITS = {
  'post.create': [
    { name: '10m', limit: 10, windowMs: 10 * MINUTE },
    { name: '1d', limit: 60, windowMs: DAY },
  ],
  'comment.create': [
    { name: '10m', limit: 30, windowMs: 10 * MINUTE },
    { name: '1d', limit: 300, windowMs: DAY },
  ],
  like: [{ name: '1m', limit: 60, windowMs: MINUTE }],
  delete: [{ name: '10m', limit: 30, windowMs: 10 * MINUTE }],
  /**
   * Yeni etiket açma (gönderi başına en çok 10 hashtag): etiket tablosu ve autocomplete'in
   * çöple dolmasını sınırlar. Var olan etiketi kullanmak sayılmaz. Gönderi transaction'ında
   * tüketilir: reddedilen gönderi sayacı da geri alır.
   */
  'tag.create': [{ name: '1d', limit: 50, windowMs: DAY }],
} as const satisfies Record<string, readonly Window[]>;

/** Aynı yazardan aynı alıcıya günlük en fazla mention bildirimi (taciz/spam tavanı). */
export const MENTION_NOTIFICATIONS_PER_PAIR_PER_DAY = 20;

export type WriteAction = keyof typeof WRITE_RATE_LIMITS;

/**
 * Eylemin tüm pencerelerini tüketir; biri aşılmışsa `RATE_LIMITED` + `retryAfter` (sn, en uzun
 * bekleme). Her pencere ayrı sayılır: kısa pencerede reddedilen istek günlük kotadan da düşer
 * (bilinçli: spam denemesi de kotayı tüketsin).
 */
export const consumeWriteRateLimit = async (
  db: RateLimitDb,
  action: WriteAction,
  userId: number,
  now: Date = new Date(),
  cost = 1
): Promise<Result<null>> => {
  let retryAfter = 0;
  for (const window of WRITE_RATE_LIMITS[action]) {
    const result = await consumeRateLimit(
      db,
      {
        key: `${action}:${window.name}:u:${userId}`,
        limit: window.limit,
        windowMs: window.windowMs,
      },
      now,
      cost
    );
    if (!result.allowed) retryAfter = Math.max(retryAfter, result.retryAfterSeconds);
  }
  return retryAfter > 0 ? fail(ErrorCode.RATE_LIMITED, { retryAfter }) : ok(null);
};

/**
 * Mention bildirimi tavanı: (yazar, alıcı) çifti başına günde
 * `MENTION_NOTIFICATIONS_PER_PAIR_PER_DAY`. Tavanı aşan alıcı bildirim almaz; gönderi yine yazılır
 * (mention linki kalır). Gönderi transaction'ında çağrılır; alıcılar artan sırayla işlenir ki
 * eşzamanlı iki yazma sayaç satırlarını farklı sırada kilitleyip deadlock'a girmesin.
 */
export const capMentionRecipients = async (
  db: RateLimitDb,
  authorId: number,
  recipientIds: readonly number[],
  now: Date
): Promise<number[]> => {
  const allowed: number[] = [];
  for (const recipientId of [...recipientIds].sort((a, b) => a - b)) {
    const result = await consumeRateLimit(
      db,
      {
        key: `mention:1d:u:${authorId}:to:${recipientId}`,
        limit: MENTION_NOTIFICATIONS_PER_PAIR_PER_DAY,
        windowMs: DAY,
      },
      now
    );
    if (result.allowed) allowed.push(recipientId);
  }
  return allowed;
};
