-- Geri alma: 20261010120500_m1_tag_slug_backfill
-- Slug'lar temizlenir ve fold_tag() kaldırılır. Etiket BİRLEŞTİRMESİ geri alınmaz: çift etiketler
-- silinmiş, gönderileri kanonik etikete taşınmıştır (veri kaybı yok, yalnızca görünen ad tekleşti).
-- Çalıştırma: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/rollback/20261010120500_m1_tag_slug_backfill.down.sql
-- Migration'lar ters sırada geri alınır. Son ifade _prisma_migrations kaydını siler; böylece
-- `prisma migrate deploy` migration'ı yeniden uygulayabilir.

BEGIN;

UPDATE "Tag" SET "slug" = NULL WHERE "slug" IS NOT NULL;
DROP FUNCTION IF EXISTS fold_tag(TEXT);

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261010120500_m1_tag_slug_backfill';

COMMIT;
