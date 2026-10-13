-- M1 expand: hesap silindikten sonra yasal saklama için asgari kimlik (5651 / adli talepler).
--
-- Hesap silme akışı (S5+) User satırını anonimleştirir/siler; ContentEvent yalnızca
-- actorUserId taşıdığı için o kullanıcıyı adli bir talepte tanımlamak üzere yalnızca
-- firebaseUid + e-posta, purgeAt'e kadar burada tutulur. purgeAt dolunca
-- scripts/purge-retention.ts siler. FK yok: User satırı bu kayıttan önce gider.

-- CreateTable
CREATE TABLE "LegalIdentityRetention" (
    "userId" INTEGER NOT NULL,
    "firebaseUid" VARCHAR(128) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgeAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalIdentityRetention_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "LegalIdentityRetention_purge_after_delete" CHECK ("purgeAt" > "deletedAt")
);

-- CreateIndex
CREATE INDEX "LegalIdentityRetention_purgeAt_idx" ON "LegalIdentityRetention"("purgeAt");
