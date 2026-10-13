-- Geri alma: 20261010120310_m1_consent_event
-- PROD'DA ÇALIŞTIRILMAZ: ConsentEvent izin ispatıdır. Tablo boş değilse betik durur;
-- yalnızca test ortamında `SET borsaliyorum.allow_event_drop = 'on'` ile zorlanabilir.
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010120310_m1_consent_event.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DO $$
BEGIN
  IF to_regclass('"ConsentEvent"') IS NOT NULL
     AND EXISTS (SELECT 1 FROM "ConsentEvent")
     AND current_setting('borsaliyorum.allow_event_drop', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'ConsentEvent boş değil; izin kaydı silinmez (bkz. dosya başı)';
  END IF;
END;
$$;

DROP TABLE IF EXISTS "ConsentEvent";
DROP TYPE IF EXISTS "ConsentKind";
DROP TYPE IF EXISTS "ConsentSource";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010120310_m1_consent_event';

COMMIT;
