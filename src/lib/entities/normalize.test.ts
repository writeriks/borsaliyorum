import { describe, expect, it } from 'vitest';

import { countChars, MAX_MARKS_PER_GRAPHEME, normalizeContent } from './normalize';
import { parseEntities } from './parse';

describe('normalizeContent', () => {
  it('CRLF ve tek CR satır sonunu LF yapar', () => {
    expect(normalizeContent('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('NFC uygular', () => {
    expect(normalizeContent('s\u0327i\u0307')).toBe('şi\u0307'.normalize('NFC'));
    expect(normalizeContent('S\u0327').length).toBe(1);
  });

  it('C0/C1 kontrol karakterlerini siler; \\n ve \\t kalır', () => {
    expect(normalizeContent('a\u0000b\u0007c\u001Fd\u007Fe\u0085f\tg\nh')).toBe('abcdef\tg\nh');
  });

  it('bidi override/isolate karakterlerini siler', () => {
    const spoofed = '$THYAO \u202Eyükselir\u202C \u2066x\u2069 \u202A\u202B\u202D\u2067\u2068';
    const cleaned = normalizeContent(spoofed);
    expect(cleaned).toBe('$THYAO yükselir x');
    expect(cleaned).not.toMatch(/[\u202A-\u202E\u2066-\u2069]/);
  });

  it('bidi ile gizlenmiş cashtag temizlendikten sonra görünen kodla ayrıştırılır', () => {
    expect(parseEntities(normalizeContent('$\u202EOAYHT')).map(e => e.type)).toEqual(['cashtag']);
  });

  it('ZWJ (emoji dizileri) korunur', () => {
    expect(normalizeContent('👨\u200D👩\u200D👧')).toBe('👨\u200D👩\u200D👧');
  });

  it('silinen karakterin ayırdığı birleşik karakteri NFC ile birleştirir', () => {
    expect(normalizeContent('s\u202E\u0327')).toBe('ş');
  });

  it('3+ boş satırı 2 boş satıra indirir; boşluk/tab içeren satırlar da boş sayılır', () => {
    expect(normalizeContent('a\n\n\n\n\nb')).toBe('a\n\n\nb');
    expect(normalizeContent('a\n \n\t\n  \nb')).toBe('a\n\n\nb');
    expect(normalizeContent('a\n\n\nb')).toBe('a\n\n\nb');
    expect(normalizeContent('a\n\nb')).toBe('a\n\nb');
  });

  it('baştaki ve sondaki boşlukları kırpar', () => {
    expect(normalizeContent('  \n\t $THYAO \n\n ')).toBe('$THYAO');
    expect(normalizeContent('   ')).toBe('');
  });
});

describe('normalizeContent — birleştirici işaret sınırı (zalgo)', () => {
  const marksPerGrapheme = (text: string): number[] => {
    const segmenter = new Intl.Segmenter('tr', { granularity: 'grapheme' });
    return [...segmenter.segment(text)].map(({ segment }) => segment.match(/\p{M}/gu)?.length ?? 0);
  };

  it(`grafem başına en fazla ${MAX_MARKS_PER_GRAPHEME} işaret kalır; ilk işaretler korunur`, () => {
    const zalgo = `a${'\u0301\u0316\u0350\u0361\u0489'.repeat(40)}b`;
    const result = normalizeContent(zalgo);
    expect(Math.max(...marksPerGrapheme(result))).toBeLessThanOrEqual(MAX_MARKS_PER_GRAPHEME);
    expect(countChars(result)).toBe(2);
    expect(marksPerGrapheme(result)).toEqual([MAX_MARKS_PER_GRAPHEME, 0]);
    expect(result.startsWith('á')).toBe(true);
  });

  it('ZWJ ile bölünmüş işaretler de aynı grafemde sayılır (ardışık olmasa da kırpılır)', () => {
    const split = `x${'\u0300\u0301\u0302\u0303\u200D'.repeat(30)}`;
    const result = normalizeContent(split);
    expect(Math.max(...marksPerGrapheme(result))).toBeLessThanOrEqual(MAX_MARKS_PER_GRAPHEME);
  });

  it('gerçek dil metnine dokunmaz (Vietnamca, Türkçe, Devanagari, emoji)', () => {
    for (const text of [
      'Tiếng Việt ở đây',
      'ğüşıöç İĞÜŞÖÇ',
      'नमस्ते दुनिया',
      '👍🏽 1\uFE0F\u20E3 👨\u200D👩\u200D👧',
    ]) {
      expect(normalizeContent(text)).toBe(text.normalize('NFC'));
    }
  });

  it('kırpma sonrası NFC ve idempotent', () => {
    const text = `e${'\u0301\u0302'.repeat(10)}`;
    const once = normalizeContent(text);
    expect(once).toBe(once.normalize('NFC'));
    expect(normalizeContent(once)).toBe(once);
  });
});

describe('countChars', () => {
  it.each([
    ['', 0],
    ['abc', 3],
    ['ğüşıöç', 6],
    ['👨\u200D👩\u200D👧', 1],
    ['🇹🇷', 1],
    ['e\u0301', 1],
    ['a\nb', 3],
  ])('%j → %i', (input, expected) => {
    expect(countChars(input)).toBe(expected);
  });

  it('1000 grafem sınırı emoji ile karışık metinde doğru sayılır', () => {
    expect(countChars('👍'.repeat(1000))).toBe(1000);
  });
});
