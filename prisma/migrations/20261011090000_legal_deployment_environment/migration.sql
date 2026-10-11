-- Bu veritabanının hangi ortama (Firebase projesine) ait olduğu (ADR-0001 "Yetim hesap imhası").
-- Tek satır (id = 1). Migration satırı YAZMAZ: her ortamda bir kez elle eklenir, örn.
--   INSERT INTO "DeploymentEnvironment" ("id", "firebaseProjectId", "label")
--   VALUES (1, 'borsaliyorum-prod', 'production');
-- Geri alınamaz toplu işler (Firebase yetim hesap imhası) bu satır FIREBASE_PROJECT_ID ile
-- eşleşmezse ya da yoksa çalışmaz: prod Firebase secret'ı yanlışlıkla dev/preview DB'siyle
-- (ya da tersi) eşleşirse tüm hesaplar "yetim" görünür ve silinirdi.

-- CreateTable
CREATE TABLE "DeploymentEnvironment" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "firebaseProjectId" VARCHAR(128) NOT NULL,
    "label" VARCHAR(32) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeploymentEnvironment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DeploymentEnvironment_singleton" CHECK ("id" = 1)
);

-- Bakım rolü yalnızca okur (etiketi değiştiremez); User'ı yalnızca sayar/eşleştirir.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_maintenance') THEN
    GRANT SELECT ON "DeploymentEnvironment", "User" TO app_maintenance;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    GRANT SELECT ON "DeploymentEnvironment" TO app_rw;
  END IF;
END;
$$;
