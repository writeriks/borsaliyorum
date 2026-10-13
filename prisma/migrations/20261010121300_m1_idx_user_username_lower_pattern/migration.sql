-- M1 index: Kullanıcı autocomplete öneki: lower(username) LIKE 'q%'. Prisma ifade
-- index'ini şemada gösteremez; db:migrations:check varlığını ayrıca doğrular.
--
-- CONCURRENTLY: tabloyu yazmaya kilitlemez ama transaction içinde çalışamaz; bu yüzden dosyada
-- tek ifadedir. Yarıda kalırsa INVALID index kalır → ADR-0001 "Prod migration runbook".
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_username_lower_pattern_idx" ON "User"(lower("username") text_pattern_ops);
