-- Geri alma: 20261010120700_m1_idx_post_feed_cursor
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010120700_m1_idx_post_feed_cursor.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DROP INDEX IF EXISTS "Post_feed_cursor_idx";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010120700_m1_idx_post_feed_cursor';

COMMIT;
