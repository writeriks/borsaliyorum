-- M1 index: Gönderi detayı yorum imleci: postId + (createdAt, commentId) artan.
--
-- CONCURRENTLY: tabloyu yazmaya kilitlemez ama transaction içinde çalışamaz; bu yüzden dosyada
-- tek ifadedir. Yarıda kalırsa INVALID index kalır → ADR-0001 "Prod migration runbook".
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Comment_post_cursor_idx" ON "Comment"("postId", "createdAt", "commentId");
