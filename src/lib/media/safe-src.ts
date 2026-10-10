/**
 * Eski uygulamanın görselleri (gönderi medyası, avatarlar) yalnızca Firebase Storage'da
 * tutuluyordu. Başka host'tan görsel yüklemek okurun IP'sini/okuma zamanını üçüncü tarafa
 * sızdırır (izleme pikseli) ve kirli veriyle keyfi içerik gösterir; bu yüzden tam host eşleşmeli
 * allowlist (alt alan adı kabul edilmez).
 */
export const LEGACY_MEDIA_HOSTS: ReadonlySet<string> = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]);

/**
 * Yalnızca `https`, varsayılan port, kullanıcı bilgisi yok ve allowlist'teki host
 * (`javascript:`/`data:`/karışık içerik dışarıda). Uymayan ya da bozuk değer `null`: çağıran
 * görseli göstermez (avatar → baş harfler).
 */
export const toSafeMediaSrc = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const safe =
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      LEGACY_MEDIA_HOSTS.has(url.hostname);
    return safe ? url.href : null;
  } catch {
    // Bozuk URL beklenen bir girdi (eski veri, 3. taraf yanıtı), hata değil: görsel gösterilmez.
    // `URL.parse` iOS 17 Safari'de yok, bu yüzden try/catch.
    return null;
  }
};
