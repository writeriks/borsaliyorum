import type { StockIndexItem, TagSuggestion, UserSuggestion } from '@/features/composer/types';
import { foldTag } from '@/lib/entities';
import { toSafeMediaSrc } from '@/lib/media';

/**
 * DB satırı → istemci DTO'su. Alanlar tek tek seçilir: satıra yanlışlıkla `email` ya da
 * `firebaseUserId` gelse de çıktıya geçemez (coding-standards "Prisma modelleri istemciye
 * doğrudan gönderilmez"). Sınırlar composer'ın istemci şemalarıyla aynı (`composer/schemas.ts`):
 * şemaya uymayan tek bir satır tüm listeyi düşürmesin diye burada kırpılır.
 */

export const DISPLAY_NAME_MAX = 100;
export const STOCK_NAME_MAX = 200;
export const TAG_NAME_MAX = 200;

/** UTF-16 uzunluğu `max`'ı aşmayacak şekilde kırpar; vekil çiftini bölmez. */
export const truncateUtf16 = (value: string, max: number): string => {
  if (value.length <= max) return value;
  let out = '';
  for (const char of value) {
    if (out.length + char.length > max) break;
    out += char;
  }
  return out;
};

export type UserSuggestionRow = {
  readonly username: string;
  readonly displayName: string;
  readonly profilePhoto: string | null;
  readonly following: boolean;
};

export const toUserSuggestion = (row: UserSuggestionRow): UserSuggestion => ({
  username: row.username,
  displayName: truncateUtf16(row.displayName, DISPLAY_NAME_MAX),
  // Allowlist dışı/bozuk URL null'a düşer (istemci baş harfleri gösterir)
  avatarUrl: toSafeMediaSrc(row.profilePhoto),
  following: row.following,
});

export type StockIndexRow = {
  readonly ticker: string;
  readonly companyName: string;
  readonly stockType: string;
  readonly mentions: number;
};

const STOCK_TYPE_MAP: Readonly<Record<string, StockIndexItem['type']>> = {
  stock: 'stock',
  crypto: 'crypto',
  other: 'other',
};

export const toStockIndexItem = (row: StockIndexRow): StockIndexItem => ({
  t: row.ticker,
  n: truncateUtf16(row.companyName, STOCK_NAME_MAX),
  type: STOCK_TYPE_MAP[row.stockType] ?? 'other',
  m: row.mentions,
});

export type TagSuggestionRow = {
  readonly slug: string;
  readonly tagName: string;
  readonly count: number;
};

// Composer etiketi `#${name}` olarak ekler: ad yalnızca etiket gövdesi karakterlerinden oluşmalı
const TAG_BODY_RE = /^[\p{L}\p{N}\p{M}_]+$/u;

/**
 * `tagName` ilk kullanılan biçimdir (eski kayıtlarda başında `#` var). Görünen ad gövde
 * karakterlerinden oluşmuyorsa, çok uzunsa ya da katlanınca slug'a eşit değilse (seçilen öneri
 * başka bir etikete gitmesin) slug kullanılır.
 */
export const toTagSuggestion = (row: TagSuggestionRow): TagSuggestion => {
  const name = row.tagName.replace(/^#+/, '').trim();
  const usable =
    TAG_BODY_RE.test(name) && name.length <= TAG_NAME_MAX && foldTag(name) === row.slug;
  return { slug: row.slug, name: usable ? name : row.slug, count: row.count };
};
