import { describe, expect, it } from 'vitest';

import { parseEntities } from './parse';
import { type EntitySummary, summarize } from './test-utils';

const cashtag = (text: string, value: string): EntitySummary => ({ type: 'cashtag', text, value });
const hashtag = (text: string, value: string): EntitySummary => ({ type: 'hashtag', text, value });
const mention = (text: string, value: string): EntitySummary => ({ type: 'mention', text, value });
const url = (text: string, value: string = text): EntitySummary => ({ type: 'url', text, value });

/** ADR-0002 Karar 2 kabul tablosu — satır satır, birden çok girdili satırlar ayrı vaka. */
const ACCEPTANCE: ReadonlyArray<readonly [string, EntitySummary[]]> = [
  ['$THYAO yükselir', [cashtag('$THYAO', 'THYAO')]],
  ['$100 kazandım', []],
  ['US$100', []],
  ['fiyat=$THYAO', []],
  ['—$THYAO', []],
  ['$THYAOXYZ1', []],
  ["$thyao'nun bilançosu", [cashtag('$thyao', 'THYAO')]],
  ['$THYAO, $ASELS.', [cashtag('$THYAO', 'THYAO'), cashtag('$ASELS', 'ASELS')]],
  ['$ALTINS1', [cashtag('$ALTINS1', 'ALTINS1')]],
  ['$BTC/$ETH', [cashtag('$BTC', 'BTC')]],
  ["#bist100'de düşüş", [hashtag('#bist100', 'bist100')]],
  ['#İstanbul #ŞİŞE', [hashtag('#İstanbul', 'istanbul'), hashtag('#ŞİŞE', 'sise')]],
  ['#1 hisse', []],
  ['C# öğren', []],
  ['abc#def', []],
  ['https://x.com/a#b?c=$d @ali', [url('https://x.com/a#b?c=$d'), mention('@ali', 'ali')]],
  ['(bkz. https://kap.org.tr/tr/Bildirim/123).', [url('https://kap.org.tr/tr/Bildirim/123')]],
  ["www.borsa.com'da", [url('www.borsa.com', 'https://www.borsa.com/')]],
  ['ali@gmail.com @veli_1. @ab @a.b', [mention('@veli_1', 'veli_1')]],
  ['@ayşe', []],
  ['http://user:pw@evil.com', []],
  ['https://localhost/x', []],
  ['😀#emoji $SISE', [cashtag('$SISE', 'SISE')]],
  // S4 review sonrası eklenenler
  ['javascript:alert(1)', []],
  ['Kaynak:https://kap.org.tr/x', [url('https://kap.org.tr/x')]],
  ['#kâr #kar', [hashtag('#kâr', 'kar'), hashtag('#kar', 'kar')]],
];

describe('ADR-0002 kabul tablosu', () => {
  it.each(ACCEPTANCE)('%j', (input, expected) => {
    expect(summarize(input)).toEqual(expected);
  });

  it('emoji sonrası offset UTF-16 code unit cinsindendir (start 9)', () => {
    expect(parseEntities('😀#emoji $SISE')).toEqual([
      { type: 'cashtag', start: 9, end: 14, ticker: 'SISE' },
    ]);
  });
});
