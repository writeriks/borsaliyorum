import { describe, expect, it } from 'vitest';

import { countChars, normalizeContent } from './normalize';
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
