-- M1 expand: link önizleme önbelleği (ADR-0002 §6). Görsel yok (K6).

-- CreateEnum
CREATE TYPE "LinkPreviewStatus" AS ENUM ('ok', 'failed', 'blocked');

-- CreateTable
CREATE TABLE "LinkPreview" (
    "id" SERIAL NOT NULL,
    "urlHash" CHAR(64) NOT NULL,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "status" "LinkPreviewStatus" NOT NULL,
    "siteName" VARCHAR(100),
    "title" VARCHAR(120),
    "description" VARCHAR(200),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkPreview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkPreview_urlHash_key" ON "LinkPreview"("urlHash");

-- AddForeignKey
-- Post.linkPreviewId yeni ve tamamen NULL; doğrulama taraması kısa sürer.
ALTER TABLE "Post" ADD CONSTRAINT "Post_linkPreviewId_fkey" FOREIGN KEY ("linkPreviewId") REFERENCES "LinkPreview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
