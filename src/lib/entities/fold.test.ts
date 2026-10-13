import { describe, expect, it } from 'vitest';

import { foldTag, toTicker } from './fold';

describe('toTicker', () => {
  it.each([
    ['sise', 'SISE'],
    ['isctr', 'ISCTR'],
    ['ThYaO', 'THYAO'],
    ['altins1', 'ALTINS1'],
    ['THYAO', 'THYAO'],
    ['', ''],
  ])('%j → %j', (input, expected) => {
    expect(toTicker(input)).toBe(expected);
  });

  it('Türkçe locale büyütmesi yapmaz (İ üretmez)', () => {
    expect(toTicker('sise')).not.toContain('İ');
  });

  it('ASCII dışını değiştirmez', () => {
    expect(toTicker('şişe')).toBe('şIşE');
  });
});

describe('foldTag', () => {
  it.each([
    ['BİST100', 'bist100'],
    ['BIST100', 'bist100'],
    ['bist100', 'bist100'],
    ['İstanbul', 'istanbul'],
    ['ŞİŞE', 'sise'],
    ['ışık', 'isik'],
    ['Güneş', 'gunes'],
    ['ÖĞRENCİ', 'ogrenci'],
    ['Çay', 'cay'],
    ['Temettü_2026', 'temettu_2026'],
    ['', ''],
  ])('%j → %j', (input, expected) => {
    expect(foldTag(input)).toBe(expected);
  });

  it('NFD girdiyi önce birleştirir', () => {
    expect(foldTag('S\u0327I\u0307S\u0327E')).toBe('sise');
  });

  it('idempotenttir', () => {
    for (const s of ['BİST100', 'ŞİŞE', 'ışık', 'Ü']) expect(foldTag(foldTag(s))).toBe(foldTag(s));
  });
});

describe('foldTag — birleştirici işaretler', () => {
  it.each([
    ['İ\u0301', 'í'],
    ['ş\u0327', 's'],
  ])('%j sabit noktaya katlanır', (input, expected) => {
    expect(foldTag(input)).toBe(expected);
    expect(foldTag(foldTag(input))).toBe(foldTag(input));
  });
});
