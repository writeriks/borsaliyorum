-- M1 expand: izin olayları (KVKK açık rıza / 6563 ticari elektronik ileti). Append-only.
--
-- Pazarlama izni User'da tek bir zaman damgası olarak değil, her verme/geri alma ayrı satır
-- olarak tutulur: ispat yükü platformdadır (hangi metin sürümü, hangi kanal, nereden, ne zaman).
-- Güncel durum, (userId, kind) için en son satırdır. Aydınlatma metni bir izin değildir; onun
-- okunduğu User.noticeVersion/noticeAcknowledgedAt'ta tutulur.
-- Kullanıcı silinse de ispat için kayıt kalır → userId için FK yok (saklama: legal).

-- CreateEnum
CREATE TYPE "ConsentKind" AS ENUM ('marketing_email', 'marketing_sms', 'marketing_call', 'marketing_push');

-- CreateEnum
CREATE TYPE "ConsentSource" AS ENUM ('signup', 'settings', 'unsubscribe_link', 'iys', 'support');

-- CreateTable
CREATE TABLE "ConsentEvent" (
    "id" BIGSERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" "ConsentKind" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "textVersion" VARCHAR(20),
    "source" "ConsentSource" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id"),
    -- İzin verilirken hangi metnin onaylandığı zorunlu; geri almada (ör. abonelik iptali linki) yok
    CONSTRAINT "ConsentEvent_text_version_required" CHECK (NOT "granted" OR "textVersion" IS NOT NULL)
);

-- CreateIndex
CREATE INDEX "ConsentEvent_userId_kind_at_idx" ON "ConsentEvent"("userId", "kind", "at");

CREATE TRIGGER consent_event_append_only
  BEFORE UPDATE OR DELETE ON "ConsentEvent"
  FOR EACH ROW EXECUTE FUNCTION append_only_guard();

CREATE TRIGGER consent_event_no_truncate
  BEFORE TRUNCATE ON "ConsentEvent"
  FOR EACH STATEMENT EXECUTE FUNCTION append_only_guard();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON "ConsentEvent" FROM app_rw;
    GRANT SELECT, INSERT ON "ConsentEvent" TO app_rw;
    GRANT USAGE ON SEQUENCE "ConsentEvent_id_seq" TO app_rw;
  END IF;
END;
$$;
