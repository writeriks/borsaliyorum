-- M1 index: Çift gönderim idempotency anahtarı (yalnızca v2 doldurur; eski satırlar NULL).
--
-- CONCURRENTLY: tabloyu yazmaya kilitlemez ama transaction içinde çalışamaz; bu yüzden dosyada
-- tek ifadedir. Yarıda kalırsa INVALID index kalır → ADR-0001 "Prod migration runbook".
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Post_clientRequestId_key" ON "Post"("clientRequestId");
