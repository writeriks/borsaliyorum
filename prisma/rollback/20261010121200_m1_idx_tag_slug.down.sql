-- Geri alma: 20261010121200_m1_idx_tag_slug
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010121200_m1_idx_tag_slug.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DROP INDEX IF EXISTS "Tag_slug_key";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010121200_m1_idx_tag_slug';

COMMIT;
