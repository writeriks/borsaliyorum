-- M1 expand: 5651 / moderasyon içerik olay kaydı (ADR-0001). Append-only.
-- Kullanıcı silinse de kayıt kalmalı → actorUserId için FK yok.

-- CreateTable
CREATE TABLE "ContentEvent" (
    "id" BIGSERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" INTEGER NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "entityType" VARCHAR(20) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "ip" INET,
    "userAgent" VARCHAR(300),
    "requestId" VARCHAR(64),

    CONSTRAINT "ContentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentEvent_actorUserId_at_idx" ON "ContentEvent"("actorUserId", "at");

-- CreateIndex
CREATE INDEX "ContentEvent_entityType_entityId_idx" ON "ContentEvent"("entityType", "entityId");

-- Append-only koruması. UPDATE her zaman, DELETE/TRUNCATE yalnızca saklama süresi temizliği
-- (content_event_purge) ya da test ortamı sıfırlaması sırasında transaction'a özel
-- `borsaliyorum.retention_purge = on` ayarıyla geçer. Amaç uygulama hatalarına karşı korumadır;
-- DDL yetkisi olan bir rol trigger'ı kaldırabilir (rol ayrımı: ADR-0001 app_rw / migrator).
CREATE FUNCTION content_event_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'TRUNCATE')
     AND current_setting('borsaliyorum.retention_purge', true) = 'on' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NULL END;
  END IF;
  -- Varsayılan SQLSTATE P0001: Prisma mesajı olduğu gibi taşır (23xxx FK hatasına benzetilirdi)
  RAISE EXCEPTION 'ContentEvent append-only: % izinli değil', TG_OP;
END;
$$;

CREATE TRIGGER content_event_append_only
  BEFORE UPDATE OR DELETE ON "ContentEvent"
  FOR EACH ROW EXECUTE FUNCTION content_event_guard();

CREATE TRIGGER content_event_no_truncate
  BEFORE TRUNCATE ON "ContentEvent"
  FOR EACH STATEMENT EXECUTE FUNCTION content_event_guard();

-- Saklama süresi dolan kayıtları siler, silinen satır sayısını döner. Süre legal L2 ile
-- kesinleşecek; 5651 yer sağlayıcı trafik bilgisi için 1 yıldan kısa saklama reddedilir.
CREATE FUNCTION content_event_purge(retention INTERVAL) RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
  deleted BIGINT;
BEGIN
  IF retention < INTERVAL '1 year' THEN
    RAISE EXCEPTION 'ContentEvent saklama süresi en az 1 yıl olmalı (verilen: %)', retention;
  END IF;
  PERFORM set_config('borsaliyorum.retention_purge', 'on', true);
  DELETE FROM "ContentEvent" WHERE "at" < (now() AT TIME ZONE 'UTC') - retention;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  PERFORM set_config('borsaliyorum.retention_purge', 'off', true);
  RETURN deleted;
END;
$$;
