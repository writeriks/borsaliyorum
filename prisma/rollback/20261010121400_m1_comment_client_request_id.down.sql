-- Geri alma: 20261010121400_m1_comment_client_request_id
-- v2'nin yazdığı yorum idempotency anahtarları SİLİNİR (yorumların kendisi kalır).
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010121400_m1_comment_client_request_id.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

ALTER TABLE "Comment" DROP COLUMN IF EXISTS "clientRequestId";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010121400_m1_comment_client_request_id';

COMMIT;
