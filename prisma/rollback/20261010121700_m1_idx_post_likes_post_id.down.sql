-- Geri alma: 20261010121700_m1_idx_post_likes_post_id
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010121700_m1_idx_post_likes_post_id.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DROP INDEX IF EXISTS "PostLikes_postId_idx";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010121700_m1_idx_post_likes_post_id';

COMMIT;
