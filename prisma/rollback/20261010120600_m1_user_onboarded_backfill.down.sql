-- Geri alma: 20261010120600_m1_user_onboarded_backfill
-- Backfill'in verdiği onboardedAt değerleri (= createdAt) temizlenir; v2 onboarding'inde
-- yazılanlar (farklı zaman damgası) korunur.
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010120600_m1_user_onboarded_backfill.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

UPDATE "User" SET "onboardedAt" = NULL WHERE "onboardedAt" = "createdAt";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010120600_m1_user_onboarded_backfill';

COMMIT;
