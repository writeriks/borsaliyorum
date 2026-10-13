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

const parseHttpsMediaUrl = (raw: string | null | undefined): URL | null => {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const safe =
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      LEGACY_MEDIA_HOSTS.has(url.hostname);
    return safe ? url : null;
  } catch {
    // Bozuk URL beklenen bir girdi (eski veri, 3. taraf yanıtı), hata değil: görsel gösterilmez.
    // `URL.parse` iOS 17 Safari'de yok, bu yüzden try/catch.
    return null;
  }
};

/**
 * Host düzeyi kontrol: yalnızca `https`, varsayılan port, kullanıcı bilgisi yok ve allowlist'teki
 * host (`javascript:`/`data:`/karışık içerik dışarıda). Uymayan ya da bozuk değer `null`: çağıran
 * görseli göstermez (avatar → baş harfler).
 *
 * Bucket bilinmediği için istemcide kullanılır (savunma derinliği). Her iki host da herkesin
 * kendi bucket'ını barındırdığı paylaşımlı alan adlarıdır; asıl süzgeç sunucuda DTO üretirken
 * `toSafeStorageMediaSrc` ile yapılır.
 */
export const toSafeMediaSrc = (raw: string | null | undefined): string | null =>
  parseHttpsMediaUrl(raw)?.href ?? null;

// GCS bucket adı kuralı (küçük harf, rakam, `.`, `-`, `_`; 3–222). Env bozuksa hiçbir URL geçmez.
const BUCKET_NAME_RE = /^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/;

/** Allowlist host'u → yalnızca bizim bucket'ımızı gösteren yol öneki. */
const bucketPathPrefix = (hostname: string, bucket: string): string =>
  hostname === 'firebasestorage.googleapis.com' ? `/v0/b/${bucket}/` : `/${bucket}/`;

/**
 * Sunucu tarafı tam kontrol: `toSafeMediaSrc` kuralları + yol yalnızca bizim bucket'ımız
 * (`FIREBASE_STORAGE_BUCKET`). `firebasestorage.googleapis.com` için `/v0/b/<bucket>/`,
 * `storage.googleapis.com` için `/<bucket>/`. Başkasının bucket'ındaki dosya (izleme pikseli,
 * keyfi içerik) böylece istemciye hiç ulaşmaz.
 *
 * Yol `URL` ile normalize edildikten sonra karşılaştırılır (`/v0/b/<bucket>/../x` → `/v0/b/x`
 * olur ve reddedilir). Yüzde kodlu bucket adı önekle eşleşmez (fail-closed).
 */
export const toSafeStorageMediaSrc = (
  raw: string | null | undefined,
  bucket: string
): string | null => {
  if (!BUCKET_NAME_RE.test(bucket)) return null;
  const url = parseHttpsMediaUrl(raw);
  if (!url) return null;
  return url.pathname.startsWith(bucketPathPrefix(url.hostname, bucket)) ? url.href : null;
};
