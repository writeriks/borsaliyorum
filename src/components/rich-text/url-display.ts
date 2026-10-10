import { MAX_URL_LENGTH } from '@/lib/entities';

/** Görünen URL metninin üst sınırı (docs/design/v2-composer-and-entities.md §5). */
export const URL_DISPLAY_MAX = 32;
const ELLIPSIS = '…';
const SAFE_PROTOCOLS = new Set(['http:', 'https:']);
const URL_TEXT_PREFIX_RE = /^(?:https?:\/\/|www\.)/i;

const tryParseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    // Bozuk href beklenen bir durum (kirli/eski veri); çağıran düz metne düşer.
    return null;
  }
};

/**
 * Render anında href'in yeniden doğrulanması (ADR-0002 Karar 5): yalnızca `http:`/`https:`,
 * kullanıcı bilgisi yok, ≤ 2048. Veritabanındaki jsonb'ye `javascript:` ya da `data:` sızsa bile
 * link üretilmez. Dönen değer kanonik WHATWG biçimidir (punycode host).
 */
export const toSafeExternalHref = (raw: unknown): string | null => {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_URL_LENGTH) return null;
  const url = tryParseUrl(raw);
  if (url === null || !SAFE_PROTOCOLS.has(url.protocol)) return null;
  if (url.username !== '' || url.password !== '') return null;
  return url.href;
};

/**
 * Metindeki URL'nin kanonik href'i (parser'ın `href`'iyle aynı kural: `www.` → `https://`).
 * Görünen metin ile gidilen adres aynı olsun diye entity'nin href'i bununla karşılaştırılır.
 */
export const canonicalHrefOfText = (text: string): string | null => {
  if (!URL_TEXT_PREFIX_RE.test(text)) return null;
  return toSafeExternalHref(/^www\./i.test(text) ? `https://${text}` : text);
};

const stripTrailingSlash = (value: string): string =>
  value.endsWith('/') ? value.slice(0, -1) : value;

const truncate = (value: string): string => `${value.slice(0, URL_DISPLAY_MAX - 1)}${ELLIPSIS}`;

/**
 * Kısaltılmış görünen metin (tasarım §5): şema ve baştaki `www.` atılır; ≤ 32 karakterse aynen;
 * uzunsa query/fragment düşer ve host+path 31 karakterde `…` ile kesilir. Host her zaman
 * `URL.host`'tan gelir: punycode (homograf `аpple.com` → `xn--pple-43d.com`), küçük harf.
 * Path yüzde kodlu kalır; çözmek bidi/görünmez karakterleri geri getirebilir.
 */
export const shortenUrlForDisplay = (href: string): string => {
  const url = tryParseUrl(href);
  if (url === null) return href.slice(0, URL_DISPLAY_MAX);
  const host = url.host.replace(/^www\./, '');
  const full = stripTrailingSlash(`${host}${url.pathname}${url.search}${url.hash}`);
  if (full.length <= URL_DISPLAY_MAX) return full;
  if (host.length > URL_DISPLAY_MAX - 1) return truncate(host);
  const hostPath = stripTrailingSlash(`${host}${url.pathname}`);
  return hostPath.length <= URL_DISPLAY_MAX - 1 ? `${hostPath}${ELLIPSIS}` : truncate(hostPath);
};

/** Kartlarda kaynağı göstermek için host (punycode, `www.` yok); geçersizse null. */
export const displayHostOf = (href: string): string | null => {
  const safe = toSafeExternalHref(href);
  return safe === null ? null : new URL(safe).host.replace(/^www\./, '');
};
