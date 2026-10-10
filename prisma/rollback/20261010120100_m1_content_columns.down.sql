-- Geri alma: 20261010120100_m1_content_columns
-- v2'nin yazdığı entities/contentFormat/deletedAt/isSponsored/clientRequestId ve Tag.slug SİLİNİR.
-- v2'de soft-delete edilen içerik yeniden görünür hale gelir (ADR-0001 rollback riskleri).
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010120100_m1_content_columns.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

ALTER TABLE "Post" DROP COLUMN IF EXISTS "clientRequestId",
  DROP COLUMN IF EXISTS "contentFormat",
  DROP COLUMN IF EXISTS "deletedAt",
  DROP COLUMN IF EXISTS "entities",
  DROP COLUMN IF EXISTS "isSponsored",
  DROP COLUMN IF EXISTS "linkPreviewId";

ALTER TABLE "Comment" DROP COLUMN IF EXISTS "contentFormat",
  DROP COLUMN IF EXISTS "deletedAt",
  DROP COLUMN IF EXISTS "entities",
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "Tag" DROP COLUMN IF EXISTS "slug";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010120100_m1_content_columns';

COMMIT;
