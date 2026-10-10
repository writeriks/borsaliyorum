-- M1 expand: 5651 / moderasyon içerik ve erişim olay kaydı (ADR-0001). Append-only.
-- Kullanıcı silinse de kayıt kalmalı → actorUserId için FK yok.
--
-- KVKK/5651 (legal): IP düz metin, maske ya da hash olarak değil, uygulama katmanında
-- AES-256-GCM ile şifrelenmiş olarak saklanır (src/lib/crypto/ip.ts, anahtar IP_ENCRYPTION_KEY).
-- Kaynak port alınabildiğinde yazılır (Vercel arkasında her zaman yok → nullable).
-- Kullanıcı kaynaklı her işlemde IP zorunludur; yalnızca system.* (otomatik) işlemler IP'sizdir.
-- User-Agent toplanmaz (veri minimizasyonu).

-- CreateEnum
CREATE TYPE "ContentEventAction" AS ENUM (
  'post.create',
  'post.update',
  'post.delete',
  'comment.create',
  'comment.delete',
  'auth.login',
  'session.start',
  'moderation.remove',
  'system.remove'
);

-- CreateEnum
CREATE TYPE "ContentEntityType" AS ENUM ('post', 'comment', 'user');

-- CreateTable
CREATE TABLE "ContentEvent" (
    "id" BIGSERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" INTEGER NOT NULL,
    "action" "ContentEventAction" NOT NULL,
    "entityType" "ContentEntityType" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "ipEncrypted" BYTEA,
    "port" INTEGER,
    "requestId" VARCHAR(64),

    CONSTRAINT "ContentEvent_pkey" PRIMARY KEY ("id"),
    -- Kullanıcı kaynaklı işlemde IP zorunlu (uygulama hatası IP'siz kayıt yazamasın)
    CONSTRAINT "ContentEvent_ip_required" CHECK ("action" = 'system.remove' OR "ipEncrypted" IS NOT NULL),
    -- Biçim: 1 bayt sürüm + 12 bayt IV + 16 bayt GCM etiketi + en az 2 bayt ("::")
    CONSTRAINT "ContentEvent_ip_format" CHECK ("ipEncrypted" IS NULL OR octet_length("ipEncrypted") >= 31),
    CONSTRAINT "ContentEvent_port_range" CHECK ("port" IS NULL OR "port" BETWEEN 1 AND 65535)
);

-- CreateIndex
CREATE INDEX "ContentEvent_actorUserId_at_idx" ON "ContentEvent"("actorUserId", "at");

-- CreateIndex
CREATE INDEX "ContentEvent_entityType_entityId_idx" ON "ContentEvent"("entityType", "entityId");

-- CreateIndex (saklama süresi temizliği)
CREATE INDEX "ContentEvent_at_idx" ON "ContentEvent"("at");

-- Append-only koruması (ContentEvent ve ConsentEvent ortak). UPDATE her zaman, DELETE/TRUNCATE
-- yalnızca saklama süresi temizliği (content_event_purge) ya da test ortamı sıfırlaması sırasında
-- transaction'a özel `borsaliyorum.retention_purge = on` ayarıyla geçer. Bu, uygulama hatalarına
-- karşı korumadır; asıl yetki sınırı roller ayrılınca ayrıcalıklardır (aşağıda ve ADR-0001
-- "Rol ayrımı"): app_rw'nin UPDATE/DELETE/TRUNCATE yetkisi olmaz, GUC'u kurması işe yaramaz.
CREATE FUNCTION append_only_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'TRUNCATE')
     AND current_setting('borsaliyorum.retention_purge', true) = 'on' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NULL END;
  END IF;
  -- Varsayılan SQLSTATE P0001: Prisma mesajı olduğu gibi taşır (23xxx FK hatasına benzetilirdi)
  RAISE EXCEPTION '% append-only: % izinli değil', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER content_event_append_only
  BEFORE UPDATE OR DELETE ON "ContentEvent"
  FOR EACH ROW EXECUTE FUNCTION append_only_guard();

CREATE TRIGGER content_event_no_truncate
  BEFORE TRUNCATE ON "ContentEvent"
  FOR EACH STATEMENT EXECUTE FUNCTION append_only_guard();

-- Saklama süresi dolan kayıtları siler, silinen satır sayısını döner. 5651 trafik bilgisi:
-- en az 1, en fazla 2 yıl (legal L2) → aralık dışı süre reddedilir. Sınırlar takvimle
-- karşılaştırılır (interval karşılaştırması '1 year'ı 360 gün sayardı).
--
-- SECURITY DEFINER + sabit search_path: roller ayrıldığında (ADR-0001) DELETE yetkisi olmayan
-- bakım rolü yalnızca bu fonksiyonu çağırarak, yalnızca süresi dolan kayıtları silebilir.
-- EXECUTE PUBLIC'ten alınır; sahibi (migrator) ve açıkça yetki verilen rol çağırabilir.
CREATE FUNCTION content_event_purge(retention INTERVAL) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  now_utc TIMESTAMP := now() AT TIME ZONE 'UTC';
  cutoff TIMESTAMP := now_utc - retention;
  deleted BIGINT;
BEGIN
  IF retention IS NULL
     OR cutoff > now_utc - INTERVAL '1 year'
     OR cutoff < now_utc - INTERVAL '2 years' THEN
    RAISE EXCEPTION 'ContentEvent saklama süresi 1 ile 2 yıl arasında olmalı (verilen: %)', retention;
  END IF;
  PERFORM set_config('borsaliyorum.retention_purge', 'on', true);
  DELETE FROM public."ContentEvent" WHERE "at" < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  PERFORM set_config('borsaliyorum.retention_purge', 'off', true);
  RETURN deleted;
END;
$$;

REVOKE ALL ON FUNCTION content_event_purge(INTERVAL) FROM PUBLIC;

-- Rol ayrımı (ADR-0001 "Rol ayrımı"): roller bu migration'dan önce oluşturulmuşsa hemen
-- uygulanır; sonra oluşturulursa ADR'deki GRANT/REVOKE adımı elle çalıştırılır.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON "ContentEvent" FROM app_rw;
    GRANT SELECT, INSERT ON "ContentEvent" TO app_rw;
    GRANT USAGE ON SEQUENCE "ContentEvent_id_seq" TO app_rw;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_maintenance') THEN
    GRANT EXECUTE ON FUNCTION content_event_purge(INTERVAL) TO app_maintenance;
  END IF;
END;
$$;
