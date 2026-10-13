import { describe, expect, it } from 'vitest';

import { findActiveTrigger } from './trigger';

describe('findActiveTrigger', () => {
  it.each([
    ['$', { kind: 'cashtag', query: '', start: 0 }],
    ['$th', { kind: 'cashtag', query: 'th', start: 0 }],
    ['$türk', { kind: 'cashtag', query: 'türk', start: 0 }],
    ['$şişe', { kind: 'cashtag', query: 'şişe', start: 0 }],
    ['$a.ş', { kind: 'cashtag', query: 'a.ş', start: 0 }],
    ['$a1234567890123456789', { kind: 'cashtag', query: 'a1234567890123456789', start: 0 }],
    ['merhaba $thy', { kind: 'cashtag', query: 'thy', start: 8 }],
    ['($thy', { kind: 'cashtag', query: 'thy', start: 1 }],
    ['#', { kind: 'hashtag', query: '', start: 0 }],
    ['#bi', { kind: 'hashtag', query: 'bi', start: 0 }],
    ['#2026h', { kind: 'hashtag', query: '2026h', start: 0 }],
    ['#temettü', { kind: 'hashtag', query: 'temettü', start: 0 }],
    ['@', { kind: 'mention', query: '', start: 0 }],
    ['@ay', { kind: 'mention', query: 'ay', start: 0 }],
    ['satır\n@ali_', { kind: 'mention', query: 'ali_', start: 6 }],
    ['😀 #a', { kind: 'hashtag', query: 'a', start: 3 }],
    ['$THYAO', { kind: 'cashtag', query: 'THYAO', start: 0 }],
  ])('%j tetikler', (input, expected) => {
    expect(findActiveTrigger(input)).toEqual(expected);
  });

  it.each([
    [''],
    ['merhaba'],
    ['$5'],
    ['$ '],
    ['$th '],
    ['$thyao,'],
    ['$a12345678901234567890'],
    ['5$'],
    ['US$'],
    ['#1'],
    ['#2026'],
    ['#bist100 '],
    [`#${'a'.repeat(51)}`],
    ['site.com/#bolum'],
    ['mail@ornek.com'],
    ['a@b'],
    ['@ayşe'],
    [`@${'a'.repeat(21)}`],
    ['@ali '],
    ['https://x.com/@ali'],
    ['https://x.com/a(#b'],
    ['www.x.com/(@ali'],
    ['—$th'],
  ])('%j tetiklemez', input => {
    expect(findActiveTrigger(input)).toBeNull();
  });

  it('yalnızca imlecin hemen önündeki token’a bakar', () => {
    expect(findActiveTrigger('$THYAO ve #bi')).toEqual({ kind: 'hashtag', query: 'bi', start: 10 });
  });

  it('URL bittikten sonra yeni token tetiklenir', () => {
    expect(findActiveTrigger('https://x.com @al')).toEqual({
      kind: 'mention',
      query: 'al',
      start: 14,
    });
  });
});
