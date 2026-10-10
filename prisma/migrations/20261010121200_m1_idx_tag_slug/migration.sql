-- M1 index: Tag.slug tekilliği (backfill + birleştirme sonrası). NULL slug'lar çakışmaz.
--
-- CONCURRENTLY: tabloyu yazmaya kilitlemez ama transaction içinde çalışamaz; bu yüzden dosyada
-- tek ifadedir. Yarıda kalırsa INVALID index kalır → ADR-0001 "Prod migration runbook".
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Tag_slug_key" ON "Tag"("slug");
