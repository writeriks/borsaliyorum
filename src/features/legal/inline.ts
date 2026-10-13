import { LEGAL_HREF, type LegalDocumentKey } from '@/lib/legal/versions';

import { PLACEHOLDER_KEYS, type PlaceholderKey } from './content';

/**
 * Yasal metinlerdeki satır içi işaretler (HTML yok, `dangerouslySetInnerHTML` yok):
 * - `**kalın**`
 * - `[[ph:<anahtar>]]`: doldurulacak yer tutucu (ör. şirket unvanı)
 * - `[[link:<belge>|<metin>]]`: başka bir yasal sayfaya bağlantı (`LEGAL_HREF` anahtarı)
 * - `[[mail:support]]`: destek/başvuru e-postası (`src/lib/support.ts`)
 * Tanınmayan işaret hata fırlatır; içerik testleri her metni bu ayrıştırıcıdan geçirir.
 */
export type InlineToken =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'bold'; readonly text: string }
  | { readonly kind: 'placeholder'; readonly key: PlaceholderKey }
  | { readonly kind: 'link'; readonly doc: LegalDocumentKey; readonly label: string }
  | { readonly kind: 'mail' };

const TOKEN = /\[\[([a-z]+):([^\]|]+)(?:\|([^\]]+))?\]\]|\*\*([^*]+)\*\*/g;

const isPlaceholderKey = (value: string): value is PlaceholderKey =>
  (PLACEHOLDER_KEYS as readonly string[]).includes(value);

const isDocumentKey = (value: string): value is LegalDocumentKey => value in LEGAL_HREF;

const toToken = (kind: string, arg: string, label: string | undefined): InlineToken => {
  if (kind === 'ph' && isPlaceholderKey(arg) && label === undefined) {
    return { kind: 'placeholder', key: arg };
  }
  if (kind === 'link' && isDocumentKey(arg) && label) return { kind: 'link', doc: arg, label };
  if (kind === 'mail' && arg === 'support' && label === undefined) return { kind: 'mail' };
  throw new Error(`Geçersiz yasal metin işareti: [[${kind}:${arg}${label ? `|${label}` : ''}]]`);
};

export const parseLegalInline = (source: string): InlineToken[] => {
  const tokens: InlineToken[] = [];
  let last = 0;
  for (const match of source.matchAll(TOKEN)) {
    const index = match.index;
    if (index > last) tokens.push({ kind: 'text', text: source.slice(last, index) });
    const [whole, kind, arg, label, bold] = match;
    tokens.push(
      bold !== undefined ? { kind: 'bold', text: bold } : toToken(kind ?? '', arg ?? '', label)
    );
    last = index + whole.length;
  }
  if (last < source.length) tokens.push({ kind: 'text', text: source.slice(last) });
  if (tokens.some(token => token.kind === 'text' && token.text.includes('[['))) {
    throw new Error(`Kapanmamış yasal metin işareti: ${source.slice(0, 60)}`);
  }
  return tokens;
};
