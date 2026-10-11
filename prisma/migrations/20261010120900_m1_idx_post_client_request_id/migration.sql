-- M1 index: Çift gönderim idempotency anahtarı (yalnızca v2 doldurur; eski satırlar NULL).
-- Kullanıcı başına benzersiz (ADR-0002 Karar 7, S10): başka bir kullanıcının aynı kimliği
-- çakışma yaratmaz ve onun kaydını açığa çıkarmaz.
--
-- CONCURRENTLY: tabloyu yazmaya kilitlemez ama transaction içinde çalışamaz; bu yüzden dosyada
-- tek ifadedir. Yarıda kalırsa INVALID index kalır → ADR-0001 "Prod migration runbook".
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Post_userId_clientRequestId_key" ON "Post"("userId", "clientRequestId");
