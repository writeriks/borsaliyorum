import { foldTag } from './fold';

export const MAX_HASHTAG_LENGTH = 50;

const LEADING_MARK_RE = /^\p{M}/u;
const LETTER_RE = /\p{L}/u;
// NFKC bazı uyumluluk harflerini boşluk/kontrol içeren dizilere açar (U+037A → ` ͅ`).
const INVALID_SLUG_CHAR_RE = /[\s\p{C}]/u;
const LATIN_RE = /\p{Script=Latin}/u;
const LATIN_LOOKALIKE_SCRIPT_RE = /[\p{Script=Cyrillic}\p{Script=Greek}]/u;

/**
 * Hashtag gövdesinin slug'ı; etiket olamıyorsa null. Kurallar (ADR-0002 Karar 2 notları):
 * birleştirici işaretle başlayamaz (`#` üzerine biner), katlanmış slug en az bir harf içerir
 * (`#\u3164\u3164` görünmez dolgu harfi olduğu için slug'da boş kalır) ve Latin harfleri Kiril/Yunan
 * harfleriyle karışamaz (`#ВIST100` homograf taklidi).
 */
export const toHashtagSlug = (name: string): string | null => {
  if (LEADING_MARK_RE.test(name)) return null;
  const slug = foldTag(name);
  if (!LETTER_RE.test(slug) || INVALID_SLUG_CHAR_RE.test(slug)) return null;
  if ([...slug].length > MAX_HASHTAG_LENGTH) return null;
  if (LATIN_RE.test(slug) && LATIN_LOOKALIKE_SCRIPT_RE.test(slug)) return null;
  return slug;
};
