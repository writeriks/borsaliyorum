-- M1 index: Takip akışı / profil imleci: userId + (createdAt, postId) azalan.
--
-- CONCURRENTLY: tabloyu yazmaya kilitlemez ama transaction içinde çalışamaz; bu yüzden dosyada
-- tek ifadedir. Yarıda kalırsa INVALID index kalır → ADR-0001 "Prod migration runbook".
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_user_feed_cursor_idx" ON "Post"("userId", "createdAt" DESC, "postId" DESC);
