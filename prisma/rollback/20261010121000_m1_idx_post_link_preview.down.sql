-- Geri alma: 20261010121000_m1_idx_post_link_preview
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010121000_m1_idx_post_link_preview.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DROP INDEX IF EXISTS "Post_linkPreviewId_idx";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010121000_m1_idx_post_link_preview';

COMMIT;
