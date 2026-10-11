-- M1 index (S10): gönderi başına beğeni sayımı (`_count.likes`). Mevcut (userId, postId) index'i
-- postId ile başlamadığı için sayım tabloyu tarıyordu.
--
-- CONCURRENTLY: tabloyu yazmaya kilitlemez ama transaction içinde çalışamaz; bu yüzden dosyada
-- tek ifadedir. Yarıda kalırsa INVALID index kalır → ADR-0001 "Prod migration runbook".
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostLikes_postId_idx" ON "PostLikes"("postId");
