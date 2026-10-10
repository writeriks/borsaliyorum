import { foldTag } from '@/lib/entities';

import type { StockIndexItem } from '../types';

/** Öneri listesinde en fazla gösterilen satır (tasarım §2.2). */
export const MAX_SUGGESTIONS = 6;

export type StockSearchIndex = {
  items: readonly StockIndexItem[];
  /** Katlanmış kod → öğe (tam eşleşme, `$şişe` → SISE). */
  byFoldedTicker: ReadonlyMap<string, StockIndexItem>;
  /** Kanonik kod kümesi: editörde "tanınmış cashtag" kontrolü. */
  tickers: ReadonlySet<string>;
};

type Prepared = { item: StockIndexItem; code: string; name: string; words: string[] };

const preparedCache = new WeakMap<readonly StockIndexItem[], Prepared[]>();

// Şirket adında kelime başı: boşluk, tire, nokta, parantez sonrası ("Tüpraş-Türkiye" → "turkiye")
const WORD_SPLIT_RE = /[\s\-.()/,&]+/u;

const prepare = (items: readonly StockIndexItem[]): Prepared[] => {
  const cached = preparedCache.get(items);
  if (cached) return cached;
  const prepared = items.map(item => {
    const name = foldTag(item.n);
    return {
      item,
      code: foldTag(item.t),
      name,
      words: name.split(WORD_SPLIT_RE).filter(Boolean),
    };
  });
  preparedCache.set(items, prepared);
  return prepared;
};

export const createStockSearchIndex = (items: readonly StockIndexItem[]): StockSearchIndex => {
  const byFoldedTicker = new Map<string, StockIndexItem>();
  for (const item of items) byFoldedTicker.set(foldTag(item.t), item);
  return { items, byFoldedTicker, tickers: new Set(items.map(item => item.t)) };
};

/**
 * Sorgu bir hisse koduna (Türkçe katlamayla) tam eşleşiyorsa o hisse. `$isctr`, `$İSCTR`,
 * `$şişe` → kanonik kod; kullanıcının yazdığı biçim büyük harfe çevrilmez (tasarım §2.2).
 */
export const findExactStock = (
  index: StockSearchIndex,
  query: string
): StockIndexItem | undefined => (query ? index.byFoldedTicker.get(foldTag(query)) : undefined);

const rankOf = (entry: Prepared, query: string): number | null => {
  if (entry.code === query) return 0;
  if (entry.code.startsWith(query)) return 1;
  if (entry.words.some(word => word.startsWith(query))) return 2;
  if (entry.code.includes(query)) return 3;
  if (entry.name.includes(query)) return 4;
  return null;
};

/**
 * Cashtag önerileri (tasarım §2.2, ADR-0002 Karar 4): kod tam > kod önek > ad kelime başı >
 * kod içerir > ad içerir. Eşitlikte takip edilen hisse, sonra 7 günlük gönderi sayısı, sonra kod (`localeCompare('tr')`).
 * Eşleşme büyük/küçük harf ve Türkçe aksan duyarsız (`foldTag`). Ağ yok; ~600 kayıtta < 1 ms.
 */
export const searchStocks = (
  index: StockSearchIndex,
  rawQuery: string,
  followed: ReadonlySet<string> = new Set(),
  limit = MAX_SUGGESTIONS
): StockIndexItem[] => {
  const query = foldTag(rawQuery);
  if (!query) return [];
  const ranked: { item: StockIndexItem; rank: number }[] = [];
  for (const entry of prepare(index.items)) {
    const rank = rankOf(entry, query);
    if (rank !== null) ranked.push({ item: entry.item, rank });
  }
  ranked.sort(
    (a, b) =>
      a.rank - b.rank ||
      Number(followed.has(b.item.t)) - Number(followed.has(a.item.t)) ||
      (b.item.m ?? 0) - (a.item.m ?? 0) ||
      a.item.t.localeCompare(b.item.t, 'tr')
  );
  return ranked.slice(0, limit).map(entry => entry.item);
};

/** Varsayılan (boş sorgu) listesindeki kodları indeksteki öğelere çevirir; bilinmeyenler düşer. */
export const resolveTickers = (
  index: StockSearchIndex,
  tickers: readonly string[],
  limit = MAX_SUGGESTIONS
): StockIndexItem[] =>
  tickers
    .map(ticker => index.byFoldedTicker.get(foldTag(ticker)))
    .filter((item): item is StockIndexItem => item !== undefined)
    .slice(0, limit);
