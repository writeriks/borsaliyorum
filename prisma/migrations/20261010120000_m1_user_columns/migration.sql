-- M1 expand: User oturum/onboarding/onay alanları (ADR-0001 Karar 3).
-- Pazarlama izni burada değil, append-only ConsentEvent'te (legal: ispat yükü, geri alma geçmişi).
-- Hepsi nullable ya da sabit DEFAULT'lu → PG 11+ metadata-only, tablo yeniden yazılmaz.
-- Eski uygulamanın INSERT'leri bu kolonları bilmez; DEFAULT'lar doğru değeri verir.

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'deleted');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ageConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "noticeAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "noticeVersion" VARCHAR(20),
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "sessionsValidAfter" TIMESTAMP(3),
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'active',
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
