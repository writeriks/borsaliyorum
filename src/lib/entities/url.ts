import { hasLeftBoundary } from './boundaries';

export const MAX_URL_LENGTH = 2048;

// URL adayı: şema ya da `www.` ile başlar; boşluk, `<>"` ve apostrof (`www.borsa.com'da`) bitirir.
const URL_CANDIDATE_RE = /(?:https?:\/\/|www\.)[^\s<>"'’]*/giu;
const TRAILING_PUNCT = new Set(['.', ',', ':', ';', '!', '?', '"', '”']);

export type UrlCandidate = {
  /** Aday metnin tamamı; içine düşen tetikleyiciler (geçerli olsun olmasın) entity olmaz. */
  rawStart: number;
  rawEnd: number;
  /** Geçerliyse URL entity'si; değilse (kullanıcı bilgisi, `localhost`, çok uzun …) null. */
  url: { start: number; end: number; href: string } | null;
};

const countChar = (s: string, ch: string): number => s.split(ch).length - 1;

/** Sondaki noktalama ve dengesiz `)` URL'ye dahil değildir: `(bkz. https://kap.org.tr/x).` */
const trimTrailing = (candidate: string): string => {
  let end = candidate.length;
  const open = countChar(candidate, '(');
  let close = countChar(candidate, ')');
  for (;;) {
    const last = candidate.charAt(end - 1);
    if (TRAILING_PUNCT.has(last)) {
      end -= 1;
    } else if (last === ')' && close > open) {
      end -= 1;
      close -= 1;
    } else {
      return candidate.slice(0, end);
    }
  }
};

const toHref = (text: string): string => (/^www\./i.test(text) ? `https://${text}` : text);

const isAcceptableHref = (href: string): boolean => {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    // Geçersiz URL beklenen bir kullanıcı girdisi; entity üretilmez, loglanacak bir hata değil.
    return false;
  }
  if (url.username !== '' || url.password !== '') return false;
  // `localhost` gibi noktasız ve `a..b` gibi boş etiketli host'lar link sayılmaz.
  const labels = url.hostname.replace(/\.$/, '').split('.');
  return labels.length >= 2 && labels.every(label => label !== '');
};

export const findUrlCandidates = (text: string): UrlCandidate[] => {
  const result: UrlCandidate[] = [];
  for (const match of text.matchAll(URL_CANDIDATE_RE)) {
    const rawStart = match.index;
    if (!hasLeftBoundary(text, rawStart)) continue;
    const raw = match[0];
    const trimmed = trimTrailing(raw);
    const href = toHref(trimmed);
    const valid = trimmed.length <= MAX_URL_LENGTH && isAcceptableHref(href);
    result.push({
      rawStart,
      rawEnd: rawStart + raw.length,
      url: valid ? { start: rawStart, end: rawStart + trimmed.length, href } : null,
    });
  }
  return result;
};
