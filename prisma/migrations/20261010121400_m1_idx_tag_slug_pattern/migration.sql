-- M1 index: Etiket autocomplete öneki (S7, ADR-0002 Karar 4). `Tag_slug_key` varsayılan
-- collation'la kurulur; önek aralığı (`slug ~>=~ q AND slug ~<~ q'`) yalnızca text_pattern_ops
-- index'ini kullanabilir (DB collation'ı C değilse LIKE 'q%' de öyle). `slug::text` ifadesi
-- bilinçli: Prisma btree opclass'ını şemada tutamıyor (diff kaldır/ekle döngüsü); ifade
-- index'ini ise görmezden gelir. db:migrations:check varlığını ayrıca doğrular.
--
-- CONCURRENTLY: tabloyu yazmaya kilitlemez ama transaction içinde çalışamaz; bu yüzden dosyada
-- tek ifadedir. Yarıda kalırsa INVALID index kalır → ADR-0001 "Prod migration runbook".
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Tag_slug_pattern_idx" ON "Tag"(("slug"::text) text_pattern_ops);
