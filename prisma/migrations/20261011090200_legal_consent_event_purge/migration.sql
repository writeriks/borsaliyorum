-- ConsentEvent saklama süresi temizliği (aydınlatma metni "Ne kadar saklıyoruz?"; süre avukat
-- teyidi bekliyor, docs/legal/README.md). Ticari iletişim onay kayıtları, onayın sona
-- ermesinden itibaren en az 3 yıl saklanır.
--
-- Silinen: (userId, kind) için EN SON olay `granted = false` (izin geri alındı ya da hesap
-- silinirken izin sona erdirildi) ve o olay `retention`'dan eski ise o (userId, kind)'ın TÜM
-- olayları. Hâlâ geçerli izinler (son olay granted) hiç silinmez. Hesap silme akışı, verilmiş
-- her izin için silme anında bir `granted = false` olayı yazmalıdır (yoksa kayıt kalır).
--
-- content_event_purge ile aynı desen: SECURITY DEFINER + sabit search_path, append-only
-- korumasını yalnızca transaction'a özel GUC ile geçer; 3 yıldan kısa süre reddedilir.
CREATE FUNCTION consent_event_purge(retention INTERVAL) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  now_utc TIMESTAMP := now() AT TIME ZONE 'UTC';
  cutoff TIMESTAMP := now_utc - retention;
  deleted BIGINT;
BEGIN
  IF retention IS NULL OR cutoff > now_utc - INTERVAL '3 years' THEN
    RAISE EXCEPTION 'ConsentEvent saklama süresi en az 3 yıl olmalı (verilen: %)', retention;
  END IF;
  PERFORM set_config('borsaliyorum.retention_purge', 'on', true);
  WITH latest AS (
    SELECT DISTINCT ON ("userId", "kind") "userId", "kind", "granted", "at"
    FROM public."ConsentEvent"
    ORDER BY "userId", "kind", "at" DESC, "id" DESC
  )
  DELETE FROM public."ConsentEvent" ce
  USING latest l
  WHERE ce."userId" = l."userId"
    AND ce."kind" = l."kind"
    AND NOT l."granted"
    AND l."at" < cutoff;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  PERFORM set_config('borsaliyorum.retention_purge', 'off', true);
  RETURN deleted;
END;
$$;

REVOKE ALL ON FUNCTION consent_event_purge(INTERVAL) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_maintenance') THEN
    GRANT EXECUTE ON FUNCTION consent_event_purge(INTERVAL) TO app_maintenance;
  END IF;
END;
$$;
