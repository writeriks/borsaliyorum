-- Geri alma: 20261010140100_s5_consent_event_address
-- PROD'DA ÇALIŞTIRILMAZ: adres, iznin ispatının parçasıdır. Adresli satır varsa betik durur;
-- yalnızca test ortamında `SET borsaliyorum.allow_event_drop = 'on'` ile zorlanabilir.
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010140100_s5_consent_event_address.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'ConsentEvent' AND column_name = 'address'
     )
     AND EXISTS (SELECT 1 FROM "ConsentEvent" WHERE "address" IS NOT NULL)
     AND current_setting('borsaliyorum.allow_event_drop', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'ConsentEvent adres kaydı var; silinmez (bkz. dosya başı)';
  END IF;
END;
$$;

ALTER TABLE "ConsentEvent" DROP COLUMN IF EXISTS "address";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010140100_s5_consent_event_address';

COMMIT;
