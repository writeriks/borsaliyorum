import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { prefixRange } from './prefix';

/** text_pattern_ops sırası: UTF-8 bayt karşılaştırması. */
const byteCompare = (a: string, b: string): number =>
  Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));

describe('prefixRange', () => {
  it.each([
    ['ali', 'alj'],
    ['a_', 'a`'],
    ['z', '{'],
    ['9', ':'],
    ['temettü', 'temettý'],
  ])('%s → hi %s', (prefix, hi) => {
    expect(prefixRange(prefix)).toEqual({ lo: prefix, hi });
  });

  it('boş önek hata', () => {
    expect(() => prefixRange('')).toThrow(RangeError);
  });

  it('özellik: önekle başlayan her dizgi aralıkta, başlamayanlar dışında (bayt sırası)', () => {
    const word = fc.string({ unit: 'grapheme', minLength: 1, maxLength: 6 });
    fc.assert(
      fc.property(
        word,
        fc.string({ unit: 'grapheme', maxLength: 6 }),
        word,
        (prefix, rest, other) => {
          const { lo, hi } = prefixRange(prefix);
          const inside = (s: string): boolean => byteCompare(s, lo) >= 0 && byteCompare(s, hi) < 0;
          expect(inside(prefix + rest)).toBe(true);
          expect(inside(other)).toBe(other.startsWith(prefix));
        }
      )
    );
  });
});
