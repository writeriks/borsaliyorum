-- Geri alma: 20261010120320_m1_legal_identity_retention
-- PROD'DA DİKKAT: silinmiş hesapların yasal saklama kimliği. Tablo boş değilse betik durur;
-- yalnızca test ortamında `SET borsaliyorum.allow_event_drop = 'on'` ile zorlanabilir.
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010120320_m1_legal_identity_retention.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DO $$
BEGIN
  IF to_regclass('"LegalIdentityRetention"') IS NOT NULL
     AND EXISTS (SELECT 1 FROM "LegalIdentityRetention")
     AND current_setting('borsaliyorum.allow_event_drop', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'LegalIdentityRetention boş değil; yasal saklama kaydı silinmez';
  END IF;
END;
$$;

DROP TABLE IF EXISTS "LegalIdentityRetention";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010120320_m1_legal_identity_retention';

COMMIT;
