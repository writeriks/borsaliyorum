-- M1 index: LinkPreview silindiğinde ON DELETE SET NULL taraması için.
--
-- CONCURRENTLY: tabloyu yazmaya kilitlemez ama transaction içinde çalışamaz; bu yüzden dosyada
-- tek ifadedir. Yarıda kalırsa INVALID index kalır → ADR-0001 "Prod migration runbook".
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_linkPreviewId_idx" ON "Post"("linkPreviewId");
