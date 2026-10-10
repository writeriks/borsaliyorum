import { getDomain } from 'tldts';

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

/** Kod noktası güvenli kesme: emoji/astral karakter ortadan bölünüp yetim surrogate kalmasın. */
const takeCodePoints = (value: string, count: number): string =>
  Array.from(value).slice(0, count).join('');

const codePointLength = (value: string): number => Array.from(value).length;

const truncate = (value: string): string =>
  `${takeCodePoints(value, URL_DISPLAY_MAX - 1)}${ELLIPSIS}`;

// Görünmez/yön değiştirici karakterler (bidi override, sıfır genişlikli, Hangul dolgu harfleri):
// çözülmüş path'te görünen metni gidilen adresten farklı gösterebilirler.
const INVISIBLE_RE = /[\p{C}ᅟᅠㅤﾠ]/gu;

/**
 * Path'in okunur hâli (`/%C3%A7ikti` → `/çikti`). `decodeURI` ayrılmış karakterleri (`%2F`, `%3F`,
 * `%23`) çözmez, yani yolun yapısı değişmez. Çözülen bidi/görünmez karakterler atılır; bozuk
 * kodlamada kodlu hâl kalır.
 */
const readablePath = (pathname: string): string => {
  try {
    return decodeURI(pathname).replace(INVISIBLE_RE, '');
  } catch {
    // Bozuk yüzde kodlaması (`%E0%A4%A`) beklenen kirli veri; kodlu hâl zaten güvenli ASCII.
    return pathname;
  }
};

/**
 * Uzun host'u ortadan keser; kayıtlı alan adı (eTLD+1, PSL private dahil) ve port her zaman sonda
 * görünür: `kap.org.tr.bildirim-ozel-duyuru-12345.evil.com` → `kap.org.tr.bildi…-12345.evil.com`.
 * Sondan kesmek asıl alan adını gizleyip baştaki taklit alt alan adını bırakırdı. Kayıtlı alan adı
 * tek başına sınırı aşıyorsa sınır aşılır: güvenlik, görünüm sınırından önce gelir.
 */
const shortenHost = (hostname: string, port: string): string => {
  const host = port === '' ? hostname : `${hostname}:${port}`;
  const budget = URL_DISPLAY_MAX - 1;
  if (host.length <= budget) return host;
  const domain = getDomain(hostname, { allowPrivateDomains: true }) ?? hostname;
  const required = host.length - hostname.length + domain.length;
  if (required >= host.length) return host;
  const tailLength = Math.max(budget - Math.ceil(budget / 2), required);
  const headLength = Math.max(budget - tailLength, 0);
  return `${host.slice(0, headLength)}${ELLIPSIS}${host.slice(host.length - tailLength)}`;
};

/**
 * Kısaltılmış görünen metin (tasarım §5): şema ve baştaki `www.` atılır; ≤ 32 karakterse aynen;
 * uzunsa query/fragment düşer ve host+path 31 karakterde `…` ile kesilir. Host `URL`'den gelir:
 * punycode (homograf `аpple.com` → `xn--pple-43d.com`), küçük harf; uzun host ortadan kesilir ve
 * kayıtlı alan adı görünür kalır. Path yüzde kodları çözülmüş, görünmez/bidi karakterleri
 * temizlenmiş gösterilir; tam adres `title`'da.
 */
export const shortenUrlForDisplay = (href: string): string => {
  const url = tryParseUrl(href);
  if (url === null) return takeCodePoints(href, URL_DISPLAY_MAX);
  const hostname = url.hostname.replace(/^www\./, '');
  const host = url.port === '' ? hostname : `${hostname}:${url.port}`;
  const path = readablePath(url.pathname);
  const full = stripTrailingSlash(`${host}${path}${url.search}${url.hash}`);
  if (codePointLength(full) <= URL_DISPLAY_MAX) return full;
  if (host.length > URL_DISPLAY_MAX - 1) return shortenHost(hostname, url.port);
  const hostPath = stripTrailingSlash(`${host}${path}`);
  return codePointLength(hostPath) <= URL_DISPLAY_MAX - 1
    ? `${hostPath}${ELLIPSIS}`
    : truncate(hostPath);
};

/** Kartlarda kaynağı göstermek için host (punycode, `www.` yok); geçersizse null. */
export const displayHostOf = (href: string): string | null => {
  const safe = toSafeExternalHref(href);
  return safe === null ? null : new URL(safe).host.replace(/^www\./, '');
};
