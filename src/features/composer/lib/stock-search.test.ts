import { describe, expect, it } from 'vitest';

import { FIXTURE_STOCKS } from '../services/fixtures';

import {
  createStockSearchIndex,
  findExactStock,
  resolveTickers,
  searchStocks,
} from './stock-search';

const index = createStockSearchIndex(FIXTURE_STOCKS);
const codes = (query: string, followed?: ReadonlySet<string>): string[] =>
  searchStocks(index, query, followed).map(stock => stock.t);

describe('searchStocks (tasarım §2.2)', () => {
  it('kod öneki önce: $th → THYAO [AC-02]', () => {
    expect(codes('th')[0]).toBe('THYAO');
  });

  it('şirket adında kelime başı + 7 günlük gönderi sayısı: $türk → THYAO önce, TTKOM listede [AC-03]', () => {
    const result = codes('türk');
    expect(result[0]).toBe('THYAO');
    expect(result).toContain('TTKOM');
    // "Tüpraş-Türkiye" tire sonrası kelime başı
    expect(result).toContain('TUPRS');
  });

  it('Türkçe katlama: $sise ve $şişe aynı ilk sonuç [AC-04]', () => {
    expect(codes('sise')[0]).toBe('SISE');
    expect(codes('şişe')[0]).toBe('SISE');
    expect(codes('ŞİŞE')[0]).toBe('SISE');
  });

  it('eşleşme yoksa boş [AC-17]', () => {
    expect(codes('zzzz')).toEqual([]);
    expect(codes('')).toEqual([]);
  });

  it('eşitlikte takip edilen hisse önce', () => {
    // "is" → ISCTR ve ISGYO kod öneki; takip edilmeyince bahis sayısı (ISCTR 500 > ISGYO 50)
    expect(codes('is').slice(0, 2)).toEqual(['ISCTR', 'ISGYO']);
    expect(codes('is', new Set(['ISGYO'])).slice(0, 2)).toEqual(['ISGYO', 'ISCTR']);
  });

  it('kod tam eşleşme kod önekinden önce', () => {
    const items = createStockSearchIndex([
      { t: 'ASELSX', n: 'Uzun Kod', type: 'stock', m: 9999 },
      { t: 'ASELS', n: 'Aselsan', type: 'stock', m: 1 },
    ]);
    expect(searchStocks(items, 'asels').map(s => s.t)).toEqual(['ASELS', 'ASELSX']);
  });

  it('en fazla 6 sonuç', () => {
    const many = createStockSearchIndex(
      Array.from({ length: 20 }, (_, i) => ({ t: `AB${i}`, n: 'x', type: 'stock' as const }))
    );
    expect(searchStocks(many, 'ab')).toHaveLength(6);
  });
});

describe('findExactStock / resolveTickers', () => {
  it('kanonik kodu döner, kullanıcının yazdığını büyütmez [AC-05]', () => {
    expect(findExactStock(index, 'isctr')?.t).toBe('ISCTR');
    expect(findExactStock(index, 'İSCTR')?.t).toBe('ISCTR');
    expect(findExactStock(index, 'thy')).toBeUndefined();
    expect(findExactStock(index, '')).toBeUndefined();
  });

  it('varsayılan listede indekste olmayan kod düşer', () => {
    expect(resolveTickers(index, ['THYAO', 'YOK', 'asels']).map(s => s.t)).toEqual([
      'THYAO',
      'ASELS',
    ]);
  });

  it('kanonik kod kümesi', () => {
    expect(index.tickers.has('BTC')).toBe(true);
    expect(index.tickers.has('btc')).toBe(false);
  });
});
