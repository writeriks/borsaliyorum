-- M1 veri: v2 kullanıcı adı kuralına uyan mevcut hesaplar onboarding'i tamamlamış sayılır.
-- Uymayanlar (ör. Google girişinde username = e-posta, audit bulgu H) ilk girişte onboarding'e
-- düşer ve yeni kullanıcı adı seçer. Yalnızca NULL olanlar güncellenir (tekrar çalıştırılabilir).

UPDATE "User"
SET "onboardedAt" = "createdAt"
WHERE "onboardedAt" IS NULL
  AND "username" ~ '^[a-z0-9_]{3,20}$';
