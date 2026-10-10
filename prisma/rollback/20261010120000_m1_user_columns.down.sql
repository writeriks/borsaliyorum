-- Geri alma: 20261010120000_m1_user_columns
-- Kullanıcıların v2 onboarding/onay/oturum alanlarını SİLER (legal kayıtları dahil).
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010120000_m1_user_columns.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

ALTER TABLE "User" DROP COLUMN IF EXISTS "ageConfirmedAt",
  DROP COLUMN IF EXISTS "marketingOptInAt",
  DROP COLUMN IF EXISTS "noticeVersion",
  DROP COLUMN IF EXISTS "onboardedAt",
  DROP COLUMN IF EXISTS "sessionsValidAfter",
  DROP COLUMN IF EXISTS "status",
  ALTER COLUMN "createdAt" DROP DEFAULT;

DROP TYPE IF EXISTS "UserStatus";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010120000_m1_user_columns';

COMMIT;
