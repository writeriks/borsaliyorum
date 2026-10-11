-- Geri alma: 20261011090100_legal_bundle_acceptance
-- Kullanıcıların yasal metin paketi kabul kayıtlarını SİLER. Kabul kaydı varsa betik durur;
-- yalnızca test ortamında `SET borsaliyorum.allow_event_drop = 'on'` ile zorlanabilir.
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261011090100_legal_bundle_acceptance.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'User' AND column_name = 'legalBundleVersion'
     )
     AND EXISTS (SELECT 1 FROM "User" WHERE "legalBundleVersion" IS NOT NULL)
     AND current_setting('borsaliyorum.allow_event_drop', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Yasal metin paketi kabul kaydı var; silinmez (bkz. dosya başı)';
  END IF;
END;
$$;

ALTER TABLE "User" DROP COLUMN IF EXISTS "communityRulesVersion",
  DROP COLUMN IF EXISTS "disclaimerVersion",
  DROP COLUMN IF EXISTS "legalBundleVersion";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261011090100_legal_bundle_acceptance';

COMMIT;
