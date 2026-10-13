-- Yasal metin paketi kabul kaydı (Kullanım Koşulları + Topluluk Kuralları + Yatırım Uyarısı).
-- `legalBundleVersion` src/lib/legal/versions.ts'teki LEGAL_BUNDLE_VERSION'dan farklıysa
-- (aleyhe önemli değişiklik) girişli kullanıcı /yasal/yeni-surum'da yeniden kabul edene kadar
-- yazamaz; okuma serbesttir. Kabul anı `termsAcceptedAt`; hangi metin sürümlerinin kabul
-- edildiği ispat için ayrı ayrı tutulur.
-- Backfill yok: paket ilk kez bu sürümle tanımlandı; mevcut kullanıcılar (eski v1 hesapları
-- dahil) bir kez kabul ekranını görür. Nullable → PG 11+ metadata-only, tablo yeniden yazılmaz.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "communityRulesVersion" VARCHAR(20),
ADD COLUMN     "disclaimerVersion" VARCHAR(20),
ADD COLUMN     "legalBundleVersion" VARCHAR(20);
