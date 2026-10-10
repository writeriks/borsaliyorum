import type { ActiveTrigger, TriggerKind } from './types';
import { findUrlCandidates } from './url';

// Sol sınır entity grameriyle aynı; sorgu karakterleri bilinçli olarak daha geniş
// (ADR-0002 "Autocomplete tetikleyicisi", tasarım §2.1). Sorgu boş olabilir (varsayılan öneriler).
const LB = String.raw`(?<=^|[\s(\[{"'“‘])`;
const TRIGGER_RES: ReadonlyArray<readonly [TriggerKind, RegExp]> = [
  // `$türk` → şirket adıyla arama; `$5` tetiklemez.
  ['cashtag', new RegExp(String.raw`${LB}\$(?:\p{L}[\p{L}\p{N}.]{0,19})?$`, 'u')],
  // `\p{M}`: NFD yazan klavyeler (`#temettu\u0308`); işaretle başlayan gövde aşağıda reddedilir.
  ['hashtag', new RegExp(String.raw`${LB}#[\p{L}\p{N}\p{M}_]{0,50}$`, 'u')],
  ['mention', new RegExp(String.raw`${LB}@[A-Za-z0-9_]{0,20}$`, 'u')],
];
const LETTER_RE = /\p{L}/u;
const LEADING_MARK_RE = /^\p{M}/u;

/**
 * İmlecin hemen önünde açık bir `$`/`#`/`@` token'ı varsa onu döner (autocomplete).
 * URL içinde ve `#1` gibi yalnızca rakamlı etiketlerde tetiklenmez.
 */
export const findActiveTrigger = (textBeforeCaret: string): ActiveTrigger | null => {
  for (const [kind, re] of TRIGGER_RES) {
    const match = re.exec(textBeforeCaret);
    if (!match) continue;
    // Token imlece kadar uzandığı için sorgu, tetikleyiciden sonraki her şeydir.
    const query = textBeforeCaret.slice(match.index + 1);
    if (kind === 'hashtag' && query !== '') {
      if (!LETTER_RE.test(query) || LEADING_MARK_RE.test(query)) return null;
    }
    const start = match.index;
    const insideUrl = findUrlCandidates(textBeforeCaret).some(
      c => c.rawStart <= start && start < c.rawEnd
    );
    return insideUrl ? null : { kind, query, start };
  }
  return null;
};
