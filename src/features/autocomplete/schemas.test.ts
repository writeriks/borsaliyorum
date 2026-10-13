import { describe, expect, it } from 'vitest';

import { readQueryParam, tagQuerySchema, userQuerySchema } from './schemas';

const parseUser = (q?: string) => userQuerySchema.safeParse(q === undefined ? {} : { q });
const parseTag = (q?: string) => tagQuerySchema.safeParse(q === undefined ? {} : { q });

describe('userQuerySchema', () => {
  it.each([
    [undefined, ''],
    ['', ''],
    ['  ali ', 'ali'],
    ['Ali_1', 'ali_1'],
    // Türkçe büyük harf: İ → i, I → i, ı → i (foldTag). Kullanıcı adları ASCII
    // (`^[a-z0-9_]{3,20}$`) olduğu için Türkçe harf asla birebir eşleşmez; katlama, Türkçe
    // klavyede `@Işık` yazan kişinin `isik` hesabını bulması içindir. `toLowerCase` yetmezdi:
    // `'İ'.toLowerCase()` → `i̇` (U+0307 ile) olur ve regex'e takılırdı.
    ['İSMA', 'isma'],
    ['ıŞık', 'isik'],
    ['a'.repeat(20), 'a'.repeat(20)],
  ])('%j → %j', (input, expected) => {
    const result = parseUser(input);
    expect(result.success).toBe(true);
    expect(result.data?.q).toBe(expected);
  });

  it.each([
    'a'.repeat(21),
    'ali veli',
    'ali-1',
    'a%',
    "a'; DROP TABLE",
    'ali\u0000',
    'x'.repeat(101),
  ])('geçersiz: %j', input => {
    expect(parseUser(input).success).toBe(false);
  });
});

describe('tagQuerySchema', () => {
  it.each([
    [undefined, ''],
    ['BIST', 'bist'],
    ['BİST100', 'bist100'],
    ['Temettü', 'temettu'],
    ['kâr', 'kar'],
    ['halka_arz', 'halka_arz'],
    // Sınırda: ham 50 kod noktası kabul (baş/son boşluk sayılmaz)
    [` ${'a'.repeat(50)} `, 'a'.repeat(50)],
  ])('%j → %j', (input, expected) => {
    const result = parseTag(input);
    expect(result.success).toBe(true);
    expect(result.data?.q).toBe(expected);
  });

  it.each([
    'bist 100',
    '#bist',
    'a%',
    'a'.repeat(51),
    'x\u200b'.repeat(60),
    // Sınır katlamadan önce: görünmez karakter katlamada silinse de ham hâl 51 kod noktası
    `${'a'.repeat(50)}\u034f`,
    // NFKC açılımı: ham 30 kod noktası, katlanınca 60 harf (slug sınırını aşar)
    '\ufb01'.repeat(30),
  ])('geçersiz: %j', input => {
    expect(parseTag(input).success).toBe(false);
  });
});

describe('readQueryParam', () => {
  it('tek q okunur, yoksa boş nesne, tekrarlanan q reddedilir', () => {
    expect(readQueryParam(new URL('http://x/a?q=ali'))).toEqual({ q: 'ali' });
    expect(readQueryParam(new URL('http://x/a'))).toEqual({});
    expect(readQueryParam(new URL('http://x/a?q=a&q=b'))).toBeNull();
  });
});
