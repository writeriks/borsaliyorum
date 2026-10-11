-- Geri alma: 20261010121500_m1_idx_comment_client_request_id
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010121500_m1_idx_comment_client_request_id.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DROP INDEX IF EXISTS "Comment_userId_clientRequestId_key";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010121500_m1_idx_comment_client_request_id';

COMMIT;
