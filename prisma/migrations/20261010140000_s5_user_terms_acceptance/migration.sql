-- S5 legal: Kullanım Koşulları kabul kaydı (docs/legal/auth-metinleri.md, değerlendirme 2).
-- Aydınlatma metninden ayrı, zorunlu kutu; kabul edilen sürüm ve an ispat için tutulur.
-- İkisi de nullable → PG 11+ metadata-only, tablo yeniden yazılmaz. Eski uygulamanın INSERT'leri
-- bu kolonları bilmez; NULL kalır.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" VARCHAR(20);
