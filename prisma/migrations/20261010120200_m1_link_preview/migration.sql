-- M1 expand: link önizleme önbelleği (ADR-0002 §6). Görsel yok (K6).
-- url, normalize edilmiş biçimdir (src/lib/link-preview/normalize-url.ts: izleme parametreleri
-- ve fragment atılır); urlHash = sha256(url).

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

-- CreateIndex (TTL temizliği: scripts/purge-retention.ts)
CREATE INDEX "LinkPreview_expiresAt_idx" ON "LinkPreview"("expiresAt");

-- AddForeignKey
-- Post.linkPreviewId yeni ve tamamen NULL; doğrulama taraması kısa sürer.
ALTER TABLE "Post" ADD CONSTRAINT "Post_linkPreviewId_fkey" FOREIGN KEY ("linkPreviewId") REFERENCES "LinkPreview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
