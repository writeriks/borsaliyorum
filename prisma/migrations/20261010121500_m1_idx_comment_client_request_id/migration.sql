-- M1 index (S10): yorum idempotency anahtarı, kullanıcı başına benzersiz (Post ile aynı biçim).
--
-- CONCURRENTLY: tabloyu yazmaya kilitlemez ama transaction içinde çalışamaz; bu yüzden dosyada
-- tek ifadedir. Yarıda kalırsa INVALID index kalır → ADR-0001 "Prod migration runbook".
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Comment_userId_clientRequestId_key" ON "Comment"("userId", "clientRequestId");
