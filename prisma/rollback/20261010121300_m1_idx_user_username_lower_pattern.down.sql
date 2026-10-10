-- Geri alma: 20261010121300_m1_idx_user_username_lower_pattern
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010121300_m1_idx_user_username_lower_pattern.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DROP INDEX IF EXISTS "User_username_lower_pattern_idx";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010121300_m1_idx_user_username_lower_pattern';

COMMIT;
