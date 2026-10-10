import type { TriggerKind } from '@/lib/entities';

export const TRIGGER_CHAR: Readonly<Record<TriggerKind, string>> = {
  cashtag: '$',
  hashtag: '#',
  mention: '@',
};

// İmleçten sonra token'ın devamı (`$th|yao` ortasında seçim): sorgu gramerinin karakterleri
const TOKEN_TAIL_RE: Readonly<Record<TriggerKind, RegExp>> = {
  cashtag: /^[\p{L}\p{N}.]*/u,
  hashtag: /^[\p{L}\p{N}\p{M}_]*/u,
  mention: /^[A-Za-z0-9_]*/,
};

const WHITESPACE_RE = /\s/u;
// `findActiveTrigger` ile aynı sol sınır beyaz listesi (ADR-0002 Karar 2 madde 3)
const LEFT_BOUNDARY_RE = /[\s([{"'“‘]/u;

export type TextReplacement = {
  /** Paragraf içi UTF-16 offset'leri, `[from, to)`. */
  from: number;
  to: number;
  text: string;
  /** Değişiklikten sonra imlecin paragraf içi offset'i. */
  caret: number;
};

/**
 * Autocomplete seçimi: token (tetikleyici + sorgu + imleçten sonraki devamı) kanonik değer ve
 * **tek** boşlukla değiştirilir. Sonrasında zaten boşluk varsa ikinci boşluk eklenmez, imleç o
 * boşluğun ardına geçer ([AC-22]: `$th| dedi` → `$THYAO dedi`). Değer her zaman listedeki
 * kanonik değerdir (`ISCTR`), kullanıcının yazdığı biçim büyütülmez ([AC-05]).
 */
export const computeSelectionReplacement = (input: {
  paragraphText: string;
  triggerStart: number;
  caret: number;
  kind: TriggerKind;
  value: string;
}): TextReplacement => {
  const { paragraphText, triggerStart, caret, kind, value } = input;
  const tail = TOKEN_TAIL_RE[kind].exec(paragraphText.slice(caret))?.[0] ?? '';
  const to = caret + tail.length;
  const token = `${TRIGGER_CHAR[kind]}${value}`;
  const next = paragraphText.charAt(to);
  if (next !== '' && WHITESPACE_RE.test(next)) {
    return { from: triggerStart, to, text: token, caret: triggerStart + token.length + 1 };
  }
  return { from: triggerStart, to, text: `${token} `, caret: triggerStart + token.length + 1 };
};

/**
 * Toolbar `$ # @` butonu: tetikleyiciyi imlece ekler. İmleçten önce sınır olmayan bir karakter
 * varsa önce boşluk konur; aksi halde tetikleyici kelime başında olmaz ve liste açılmaz ([CMP-05]).
 */
export const computeTriggerInsertion = (textBeforeCaret: string, kind: TriggerKind): string => {
  const previous = textBeforeCaret.slice(-1);
  const needsSpace = previous !== '' && !LEFT_BOUNDARY_RE.test(previous);
  return `${needsSpace ? ' ' : ''}${TRIGGER_CHAR[kind]}`;
};
