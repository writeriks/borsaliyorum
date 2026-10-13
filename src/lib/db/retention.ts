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
 * İzin kayıtları (ConsentEvent): izin sona erdikten (geri alma ya da hesap silinirken yazılan
 * `granted = false`) sonra 3 yıl. DB fonksiyonu daha kısasını reddeder. Süre avukat teyidi
 * bekliyor (docs/legal/README.md).
 */
export const DEFAULT_CONSENT_EVENT_RETENTION = '3 years';

/**
 * Rate limit sayaçları: en uzun pencere (günlük limit, 24 saat) + 24 saat pay. Pencere süresi
 * satırda tutulmadığı için en uzun pencereye göre silinir; daha kısa pencereler zaten bitmiştir.
 */
export const RATE_LIMIT_MAX_WINDOW_HOURS = 24;
export const RATE_LIMIT_GRACE_HOURS = 24;
/**
 * Hash'lenmiş IP anahtarlı kovalar (`auth.<kural>.ip:<hmac>`, `lib/auth/rate-limit-keys.ts`):
 * legal kararı gereği en fazla 24 saat. Uygulama da her IP'li tüketimde aynı sınırla siler.
 */
export const RATE_LIMIT_IP_RETENTION_HOURS = 24;
export const RATE_LIMIT_IP_KEY_LIKE = 'auth.%.ip:%';

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
  consentEvents: number;
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
  {
    contentEventRetention = DEFAULT_CONTENT_EVENT_RETENTION,
    consentEventRetention = DEFAULT_CONSENT_EVENT_RETENTION,
  }: { contentEventRetention?: string; consentEventRetention?: string } = {}
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
  const ipBuckets = await db.query(
    `DELETE FROM "RateLimitBucket"
     WHERE "windowStart" < (now() AT TIME ZONE 'UTC') - make_interval(hours => $1)
       AND "key" LIKE $2`,
    [RATE_LIMIT_IP_RETENTION_HOURS, RATE_LIMIT_IP_KEY_LIKE]
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

  // ConsentEvent de append-only; yalnızca kendi SECURITY DEFINER fonksiyonuyla silinir
  const consents = await db.query('SELECT consent_event_purge($1::interval) AS deleted', [
    consentEventRetention,
  ]);

  return {
    contentEvents: firstNumber(events.rows, 'deleted'),
    rateLimitBuckets: (buckets.rowCount ?? 0) + (ipBuckets.rowCount ?? 0),
    linkPreviews: previews.rowCount ?? 0,
    legalIdentities: identities.rowCount ?? 0,
    consentEvents: firstNumber(consents.rows, 'deleted'),
  };
};
