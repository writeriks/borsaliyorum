-- Geri alma: 20261010120610_m1_user_birthday_erase
-- İmha geri alınamaz: silinen doğum tarihleri geri gelmez. Betik yalnızca migration kaydını
-- siler (yeniden uygulamak zararsızdır: zaten NULL olan satırlara dokunur).
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010120610_m1_user_birthday_erase.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

-- Şema değişikliği yok.

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010120610_m1_user_birthday_erase';

COMMIT;
