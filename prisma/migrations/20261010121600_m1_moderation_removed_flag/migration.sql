-- M1 expand (S10, K-A): moderatör/admin kaldırması işareti. Kaldırılan içerik `deletedAt` ile
-- gizlenir; sahibine "moderasyonla kaldırıldı" durumu gösterilebilsin diye kendi silmesinden
-- ayrılır (UI M2). Eski uygulama kolonu bilmez; DEFAULT false ile INSERT'leri geçer.
-- PG 11+: sabit DEFAULT'lu kolon eklemek tabloyu yeniden yazmaz.

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "removedByModeration" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "removedByModeration" BOOLEAN NOT NULL DEFAULT false;
