-- M1 veri: User.birthday imhası (legal L3). v2 doğum tarihi toplamaz ve kullanmaz; amaçla
-- bağlantısı kalmayan mevcut veri silinir (NULL). Kolonun kendisi eski uygulama rollback
-- penceresinde hâlâ okuyup yazdığı için burada kaldırılmaz → contract fazında DROP COLUMN
-- (ADR-0001 "Contract fazı").
--
-- Geri alınamaz: rollback betiği veriyi geri getirmez (imhanın amacı budur).

UPDATE "User" SET "birthday" = NULL WHERE "birthday" IS NOT NULL;
