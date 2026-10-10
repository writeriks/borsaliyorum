import { describe, expect, it } from 'vitest';

import { toSafeMediaSrc } from './safe-src';

describe('toSafeMediaSrc (medya host allowlist)', () => {
  it.each([
    'https://firebasestorage.googleapis.com/v0/b/ornek/o/a.png?alt=media',
    'https://storage.googleapis.com/ornek-bucket/a.png',
  ])('%s kabul edilir', src => {
    expect(toSafeMediaSrc(src)).toBe(src);
  });

  it.each([
    'https://lh3.googleusercontent.com/a/x',
    'https://ornek.com/a.png',
    'https://alt.firebasestorage.googleapis.com/a.png',
    'http://storage.googleapis.com/a.png',
    'https://storage.googleapis.com:8443/a.png',
    'https://user:pw@storage.googleapis.com/a.png',
    'https://user@storage.googleapis.com/a.png',
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    'bozuk url',
    '',
  ])('%s reddedilir', src => {
    expect(toSafeMediaSrc(src)).toBeNull();
  });

  it('null/undefined → null', () => {
    expect(toSafeMediaSrc(null)).toBeNull();
    expect(toSafeMediaSrc(undefined)).toBeNull();
  });
});
