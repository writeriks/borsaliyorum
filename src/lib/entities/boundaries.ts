/**
 * Editör, autocomplete ve sunucu aynı sınır kurallarını kullanır (ADR-0002 Karar 2, tasarım §2.1).
 * Kara liste yerine beyaz liste: `US$100`, `C#`, `ali@gmail.com`, `—$THYAO` entity olmaz.
 */
const LEFT_BOUNDARY_CHARS = new Set(['(', '[', '{', '"', "'", '“', '‘']);
const WHITESPACE_RE = /\s/;

/** `index` konumundaki tetikleyici/URL'nin solu geçerli bir sınır mı. */
export const hasLeftBoundary = (text: string, index: number): boolean => {
  if (index === 0) return true;
  // Beyaz listedeki tüm karakterler BMP'de; önceki code unit yeterli (vekil çift hiçbir zaman eşleşmez).
  const prev = text.charAt(index - 1);
  return LEFT_BOUNDARY_CHARS.has(prev) || WHITESPACE_RE.test(prev);
};

/**
 * URL'ler ek olarak `:` sonrasında da başlayabilir (`Kaynak:https://kap.org.tr/x`, ADR-0002
 * notu). Tetikleyicilerde `:` sınır değildir (`a:$THYAO` cashtag olmaz).
 */
export const hasUrlLeftBoundary = (text: string, index: number): boolean =>
  hasLeftBoundary(text, index) || text.charAt(index - 1) === ':';

const WORD_CHAR_AT_RE = /[\p{L}\p{N}\p{M}_]/uy;

/** `index`'te harf/rakam/işaret/`_` yoksa (ya da metin bittiyse) sağ sınır geçerlidir. */
export const hasRightBoundary = (text: string, index: number): boolean => {
  WORD_CHAR_AT_RE.lastIndex = index;
  return !WORD_CHAR_AT_RE.test(text);
};

/** Bir sticky regex'i `index`'ten çalıştırır; eşleşen metni ya da boş string döner. */
export const matchAt = (re: RegExp, text: string, index: number): string => {
  re.lastIndex = index;
  return re.exec(text)?.[0] ?? '';
};
