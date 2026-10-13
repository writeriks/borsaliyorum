-- S5 legal: izin olayına iletişim adresi (docs/legal/auth-metinleri.md, değerlendirme 4).
-- 6563/İYS onayı adres bazlıdır; kullanıcı e-postasını değiştirse de eski iznin hangi adrese
-- verildiği ispatlanabilmeli. Nullable → metadata-only. Append-only trigger'lar ALTER'ı
-- etkilemez (yalnızca UPDATE/DELETE/TRUNCATE).

-- AlterTable
ALTER TABLE "ConsentEvent" ADD COLUMN     "address" VARCHAR(320);
