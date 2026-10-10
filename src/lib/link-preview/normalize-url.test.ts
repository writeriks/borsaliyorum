import { describe, expect, it } from 'vitest';

import { isTrackingParam, normalizePreviewUrl } from './normalize-url';
import { previewUrlHash } from './url-hash';

describe('normalizePreviewUrl', () => {
  it.each([
    [
      'https://kap.org.tr/tr/Bildirim/123?utm_source=x&utm_medium=social&UTM_Campaign=y',
      'https://kap.org.tr/tr/Bildirim/123',
    ],
    ['https://example.com/a?fbclid=abc&id=5&gclid=def#section', 'https://example.com/a?id=5'],
    ['https://example.com/a?id=5&b=2#frag', 'https://example.com/a?id=5&b=2'],
    ['https://example.com/a?msclkid=1&igshid=2&mc_eid=3&_ga=4', 'https://example.com/a'],
    ['HTTPS://Example.COM:443/Path?x=1', 'https://example.com/Path?x=1'],
    ['http://example.com:80/', 'http://example.com/'],
    ['https://example.com./a', 'https://example.com/a'],
    ['https://example.com/a?', 'https://example.com/a'],
    ['  https://example.com/a  ', 'https://example.com/a'],
    // İzleme olmayan parametrelerin sırası ve değeri korunur
    [
      'https://example.com/s?q=thyao&page=2&ref=home',
      'https://example.com/s?q=thyao&page=2&ref=home',
    ],
    ['https://bücher.example/a', 'https://xn--bcher-kva.example/a'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePreviewUrl(input)).toBe(expected);
  });

  it.each([
    'ftp://example.com/a',
    'javascript:alert(1)',
    'https://user:pass@example.com/',
    'https://user@example.com/',
    'not a url',
    `https://example.com/${'a'.repeat(2048)}`,
  ])('rejects %s', input => {
    expect(normalizePreviewUrl(input)).toBeNull();
  });

  it('is idempotent and maps tracking variants to the same hash', () => {
    const a = normalizePreviewUrl('https://example.com/haber?id=7&utm_source=tw#yorumlar');
    const b = normalizePreviewUrl('https://EXAMPLE.com/haber?fbclid=zz&id=7');

    expect(a).toBe('https://example.com/haber?id=7');
    expect(normalizePreviewUrl(a ?? '')).toBe(a);
    expect(previewUrlHash(a ?? '')).toBe(previewUrlHash(b ?? ''));
    expect(previewUrlHash(a ?? '')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('isTrackingParam', () => {
  it('matches utm_* by prefix and known click ids case-insensitively', () => {
    expect(isTrackingParam('utm_content')).toBe(true);
    expect(isTrackingParam('FBCLID')).toBe(true);
    expect(isTrackingParam('id')).toBe(false);
    expect(isTrackingParam('ref')).toBe(false);
    expect(isTrackingParam('utmost')).toBe(false);
  });
});
