-- Geri alma: 20261010121600_m1_moderation_removed_flag
-- Moderasyon kaldırma işareti SİLİNİR (içerik `deletedAt` ile gizli kalır; kaldırma kaydı
-- ContentEvent'te `moderation.remove` olarak durur).
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010121600_m1_moderation_removed_flag.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

ALTER TABLE "Comment" DROP COLUMN IF EXISTS "removedByModeration";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "removedByModeration";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010121600_m1_moderation_removed_flag';

COMMIT;
