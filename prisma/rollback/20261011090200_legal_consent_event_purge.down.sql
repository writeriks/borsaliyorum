-- Geri alma: 20261011090200_legal_consent_event_purge
-- Yalnızca temizlik fonksiyonunu kaldırır; veri silmez. Geri alındıktan sonra
-- scripts/purge-retention.ts'in ConsentEvent adımı hata verir (eski sürüme dönülmeli).
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261011090200_legal_consent_event_purge.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DROP FUNCTION IF EXISTS consent_event_purge(INTERVAL);

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261011090200_legal_consent_event_purge';

COMMIT;
