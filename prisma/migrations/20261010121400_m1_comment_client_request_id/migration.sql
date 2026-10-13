-- M1 expand (S10): Comment çift gönderim idempotency anahtarı (ADR-0002 Karar 7 "S10 notu").
-- Yalnızca v2 doldurur; eski uygulamanın satırları NULL. Index ayrı migration'da CONCURRENTLY.

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "clientRequestId" UUID;
