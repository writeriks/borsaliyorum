import { describe, expect, it } from 'vitest';

import {
  canonicalHrefOfText,
  displayHostOf,
  shortenUrlForDisplay,
  toSafeExternalHref,
} from './url-display';

describe('shortenUrlForDisplay (tasarım §5, [URL-01])', () => {
  it.each([
    ['https://www.kap.org.tr/tr/Bildirim/1234567', 'kap.org.tr/tr/Bildirim/1234567'],
    [
      'https://www.borsaistanbul.com/tr/sayfa/2367/endeks-bilgileri?x=1',
      'borsaistanbul.com/tr/sayfa/2367…',
    ],
    ['http://example.com/', 'example.com'],
    ['https://x.com/a?b=1', 'x.com/a?b=1'],
    // Query kesildiğinde gösterilmez; host+path sığıyorsa sonuna … eklenir
    ['https://kap.org.tr/x?q=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'kap.org.tr/x…'],
    // Host 31 karakterden uzunsa yalnızca host kesilir
    [
      'https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.com/yol',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa…',
    ],
  ])('%s → %s', (href, expected) => {
    expect(shortenUrlForDisplay(href)).toBe(expected);
    expect(shortenUrlForDisplay(href).length).toBeLessThanOrEqual(32);
  });

  it('homograf host punycode gösterilir (Kiril а)', () => {
    const href = new URL('https://аpple.com/giris').href;
    expect(shortenUrlForDisplay(href)).toBe('xn--pple-43d.com/giris');
  });

  it('port korunur, şema ve www. atılır', () => {
    expect(shortenUrlForDisplay('https://www.ornek.com:8443/a')).toBe('ornek.com:8443/a');
  });

  it('geçersiz href için throw etmez', () => {
    expect(() => shortenUrlForDisplay('::::')).not.toThrow();
  });
});

describe('toSafeExternalHref (ADR-0002 Karar 5)', () => {
  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://ornek.com/x',
    'https://user:pw@evil.com/',
    '//evil.com/x',
    '/hisse/THYAO',
    '',
    `https://ornek.com/${'a'.repeat(2048)}`,
  ])('%j reddedilir', href => {
    expect(toSafeExternalHref(href)).toBeNull();
  });

  it.each([null, undefined, 42, {}, ['https://x.com']])('string olmayan %j reddedilir', value => {
    expect(toSafeExternalHref(value)).toBeNull();
  });

  it('http/https kanonik biçimde döner', () => {
    expect(toSafeExternalHref('HTTPS://Ornek.COM')).toBe('https://ornek.com/');
    expect(toSafeExternalHref('http://ornek.com/a b')).toBe('http://ornek.com/a%20b');
  });
});

describe('canonicalHrefOfText', () => {
  it('www. → https://, şemasız alan adı link değil', () => {
    expect(canonicalHrefOfText('www.borsa.com')).toBe('https://www.borsa.com/');
    expect(canonicalHrefOfText('kap.org.tr')).toBeNull();
    expect(canonicalHrefOfText('javascript:alert(1)')).toBeNull();
  });
});

describe('displayHostOf', () => {
  it('host punycode ve www.siz; güvensizse null', () => {
    expect(displayHostOf('https://www.kap.org.tr/x')).toBe('kap.org.tr');
    expect(displayHostOf('https://аpple.com/')).toBe('xn--pple-43d.com');
    expect(displayHostOf('javascript:alert(1)')).toBeNull();
  });
});
