-- Geri alma: 20261011090000_legal_deployment_environment
-- Ortam etiketini siler; yetim hesap imhası etiket olmadan çalışmaz (güvenli taraf).
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261011090000_legal_deployment_environment.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

DROP TABLE IF EXISTS "DeploymentEnvironment";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261011090000_legal_deployment_environment';

COMMIT;
