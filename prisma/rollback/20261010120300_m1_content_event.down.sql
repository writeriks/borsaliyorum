-- Geri alma: 20261010120300_m1_content_event
-- PROD'DA ÇALIŞTIRILMAZ: ContentEvent 5651 yasal kaydıdır. Tablo boş değilse betik durur;
-- yalnızca test ortamında `SET borsaliyorum.allow_event_drop = 'on'` ile zorlanabilir.
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010120300_m1_content_event.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DO $$
BEGIN
  IF to_regclass('"ContentEvent"') IS NOT NULL
     AND EXISTS (SELECT 1 FROM "ContentEvent")
     AND current_setting('borsaliyorum.allow_event_drop', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'ContentEvent boş değil; yasal kayıt silinmez (bkz. dosya başı)';
  END IF;
END;
$$;

DROP TABLE IF EXISTS "ContentEvent";
DROP FUNCTION IF EXISTS content_event_purge(INTERVAL);
DROP FUNCTION IF EXISTS content_event_guard();

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010120300_m1_content_event';

COMMIT;
