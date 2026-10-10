-- M1 expand: Post/Comment/Tag içerik alanları (ADR-0001, ADR-0002).
-- contentFormat DEFAULT 1: eski uygulamanın yazdığı her satır "eski markup" olarak işaretlenir.
-- Index'ler ayrı migration'larda CONCURRENTLY ile oluşturulur.

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "clientRequestId" UUID,
ADD COLUMN     "contentFormat" SMALLINT NOT NULL DEFAULT 1,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "entities" JSONB,
ADD COLUMN     "isSponsored" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkPreviewId" INTEGER;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "contentFormat" SMALLINT NOT NULL DEFAULT 1,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "entities" JSONB,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "slug" VARCHAR(64);
