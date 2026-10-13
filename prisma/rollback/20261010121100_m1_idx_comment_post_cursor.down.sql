-- Geri alma: 20261010121100_m1_idx_comment_post_cursor
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010121100_m1_idx_comment_post_cursor.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DROP INDEX IF EXISTS "Comment_post_cursor_idx";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010121100_m1_idx_comment_post_cursor';

COMMIT;
