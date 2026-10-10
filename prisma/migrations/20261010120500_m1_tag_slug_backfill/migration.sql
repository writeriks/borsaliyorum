-- M1 veri: Tag.slug backfill + aynı slug'a katlanan etiketlerin birleştirilmesi (ADR-0002).
--
-- Eski uygulama tagName'i '#' önekiyle saklar ('#BIST100'). Slug önek olmadan katlanır.
-- Katlama ADR-0002 foldTag ile aynıdır: önce İ I ı → i (ve Türkçe harfler ASCII'ye), sonra
-- lowercase. lower() DB'nin varsayılan collation'ına bağlı olmasın diye ICU ile çalışır.
--
-- Birleştirme kayıpsızdır: çiftlerin _PostTags satırları kanonik etikete taşınır, sonra çift
-- Tag satırı silinir (kendi _PostTags satırları FK CASCADE ile gider). Kanonik etiket: en eski
-- createdAt, eşitlikte en küçük tagId; updatedAt grubun en yenisi olur (son kullanım).
-- Geri alma birleştirmeyi geri getirmez (bkz. rollback).
--
-- v2 hashtag'ine dönüşemeyen eski etiketler (boş, 64 karakterden uzun, boşluk/ayraç içeren)
-- slug almaz (NULL); gönderi ilişkileri korunur, yalnızca v2 etiket sayfasında görünmezler.
--
-- Tek ifade (data-modifying CTE): migration nasıl çalıştırılırsa çalıştırılsın atomik.

CREATE FUNCTION fold_tag(name TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN lower(translate(name, 'İIıŞşĞğÜüÖöÇç', 'iiissgguuoocc') COLLATE "und-x-icu");

WITH candidate AS (
  SELECT "tagId", "createdAt", "updatedAt", fold_tag(regexp_replace("tagName", '^#', '')) AS slug
  FROM "Tag"
  WHERE "slug" IS NULL
),
valid AS (
  SELECT * FROM candidate
  WHERE slug <> '' AND char_length(slug) <= 64 AND slug !~ '[[:space:]#$@/\\?%&]'
),
ranked AS (
  SELECT
    "tagId",
    slug,
    first_value("tagId") OVER (PARTITION BY slug ORDER BY "createdAt", "tagId") AS keep_id,
    max("updatedAt") OVER (PARTITION BY slug) AS group_updated_at
  FROM valid
),
merge AS (
  SELECT "tagId" AS dup_id, keep_id FROM ranked WHERE "tagId" <> keep_id
),
moved AS (
  INSERT INTO "_PostTags" ("A", "B")
  SELECT DISTINCT pt."A", m.keep_id
  FROM "_PostTags" pt
  JOIN merge m ON pt."B" = m.dup_id
  ON CONFLICT DO NOTHING
  RETURNING 1
),
removed AS (
  DELETE FROM "Tag" WHERE "tagId" IN (SELECT dup_id FROM merge)
  RETURNING 1
)
UPDATE "Tag" t
SET "slug" = r.slug,
    "updatedAt" = greatest(t."updatedAt", r.group_updated_at)
FROM ranked r
WHERE t."tagId" = r."tagId"
  AND r."tagId" = r.keep_id;
-- Not: moved/removed CTE'leri ana sorgu okumasa da PostgreSQL'de her zaman tam çalışır.
