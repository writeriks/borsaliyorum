-- Geri alma: 20261010120400_m1_rate_limit_bucket
-- Rate limit sayaçları silinir (geçici veri).
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010120400_m1_rate_limit_bucket.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DROP TABLE IF EXISTS "RateLimitBucket";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010120400_m1_rate_limit_bucket';

COMMIT;
