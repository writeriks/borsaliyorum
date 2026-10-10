-- M1 expand: kullanıcı bazlı sabit pencereli rate limit sayacı (ADR-0001, Redis yerine).

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" VARCHAR(120) NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateIndex (TTL temizliği: scripts/purge-retention.ts, pencere + 24 saat)
CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");
