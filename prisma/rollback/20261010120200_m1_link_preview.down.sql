-- Geri alma: 20261010120200_m1_link_preview
-- Link önizleme önbelleği silinir (yeniden üretilebilir veri).
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010120200_m1_link_preview.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_linkPreviewId_fkey";
DROP TABLE IF EXISTS "LinkPreview";
DROP TYPE IF EXISTS "LinkPreviewStatus";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010120200_m1_link_preview';

COMMIT;
