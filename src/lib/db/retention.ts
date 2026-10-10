/**
 * Saklama süresi / TTL temizliği (legal L2, KVKK m.7 ve m.4 "gerektiği kadar saklama").
 * `scripts/purge-retention.ts` günlük çalıştırır (GitHub Actions). `server-only` içermez;
 * yalnızca pg `query` arayüzüne bağlıdır, böylece script ve integration testi aynı kodu kullanır.
 *
 * Zaman kolonları Prisma'nın `TIMESTAMP(3)` (saat dilimsiz, UTC) biçimindedir; karşılaştırma
 * `now() AT TIME ZONE 'UTC'` ile yapılır.
 */

/** 5651 trafik bilgisi: en az 1, en fazla 2 yıl (DB fonksiyonu aralık dışını reddeder). */
export const DEFAULT_CONTENT_EVENT_RETENTION = '2 years';

/**
 * Rate limit sayaçları: en uzun pencere (günlük limit, 24 saat) + 24 saat pay. Pencere süresi
 * satırda tutulmadığı için en uzun pencereye göre silinir; daha kısa pencereler zaten bitmiştir.
 */
export const RATE_LIMIT_MAX_WINDOW_HOURS = 24;
export const RATE_LIMIT_GRACE_HOURS = 24;

export type Queryable = {
  query: (
    text: string,
    values?: unknown[]
  ) => Promise<{ rows: unknown[]; rowCount: number | null }>;
};

export type RetentionSummary = {
  contentEvents: number;
  rateLimitBuckets: number;
  linkPreviews: number;
  legalIdentities: number;
};

const firstNumber = (rows: unknown[], column: string): number => {
  const row = rows[0] as Record<string, unknown> | undefined;
  return Number(row?.[column] ?? 0);
};

/**
 * Tüm temizlik adımlarını sırayla çalıştırır ve silinen satır sayılarını döner. Her adım tek
 * ifadedir ve tekrar çalıştırılabilir (yarıda kalırsa sonraki koşu kaldığı yerden devam eder).
 */
export const runRetentionPurge = async (
  db: Queryable,
  { contentEventRetention = DEFAULT_CONTENT_EVENT_RETENTION } = {}
): Promise<RetentionSummary> => {
  // ContentEvent yalnızca append-only korumasını aşabilen DB fonksiyonuyla silinir
  const events = await db.query('SELECT content_event_purge($1::interval) AS deleted', [
    contentEventRetention,
  ]);

  const buckets = await db.query(
    `DELETE FROM "RateLimitBucket"
     WHERE "windowStart" < (now() AT TIME ZONE 'UTC') - make_interval(hours => $1)`,
    [RATE_LIMIT_MAX_WINDOW_HOURS + RATE_LIMIT_GRACE_HOURS]
  );

  // Süresi dolan önizlemeler; bir gönderiye bağlı olanlar gönderinin parçasıdır, kalır
  // (yeniden çekilince expiresAt ileri alınır).
  const previews = await db.query(
    `DELETE FROM "LinkPreview" lp
     WHERE lp."expiresAt" < (now() AT TIME ZONE 'UTC')
       AND NOT EXISTS (SELECT 1 FROM "Post" p WHERE p."linkPreviewId" = lp."id")`
  );

  const identities = await db.query(
    `DELETE FROM "LegalIdentityRetention" WHERE "purgeAt" < (now() AT TIME ZONE 'UTC')`
  );

  return {
    contentEvents: firstNumber(events.rows, 'deleted'),
    rateLimitBuckets: buckets.rowCount ?? 0,
    linkPreviews: previews.rowCount ?? 0,
    legalIdentities: identities.rowCount ?? 0,
  };
};
