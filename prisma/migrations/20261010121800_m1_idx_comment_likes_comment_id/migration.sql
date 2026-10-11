-- M1 index (S10): yorum başına beğeni sayımı. Mevcut (userId, commentId) index'i commentId ile
-- başlamadığı için kullanılamıyordu.
--
-- CONCURRENTLY: tabloyu yazmaya kilitlemez ama transaction içinde çalışamaz; bu yüzden dosyada
-- tek ifadedir. Yarıda kalırsa INVALID index kalır → ADR-0001 "Prod migration runbook".
CREATE INDEX CONCURRENTLY IF NOT EXISTS "CommentLikes_commentId_idx" ON "CommentLikes"("commentId");
