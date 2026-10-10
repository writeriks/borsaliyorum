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
    // Host 31 karakterden uzunsa host ortadan kesilir, path düşer
    [
      'https://cok.uzun.bir.alt.alan.adi.zinciri.ornek.com.tr/yol',
      'cok.uzun.bir.alt…ri.ornek.com.tr',
    ],
  ])('%s → %s', (href, expected) => {
    expect(shortenUrlForDisplay(href)).toBe(expected);
    expect(shortenUrlForDisplay(href).length).toBeLessThanOrEqual(32);
  });

  describe('uzun host: kayıtlı alan adı (eTLD+1) her zaman görünür (güvenlik)', () => {
    it('taklit alt alan adı ortadan kesilir, gerçek alan adı sonda kalır', () => {
      const display = shortenUrlForDisplay(
        'https://www.kap.org.tr.bildirim-ozel-duyuru-12345.evil.com/x'
      );
      expect(display).toBe('kap.org.tr.bildi…-12345.evil.com');
      expect(display).toContain('evil.com');
      expect(display.length).toBeLessThanOrEqual(32);
    });

    it('uzun kayıtlı alan adı kısaltılmaz (sınır aşılır, alan adı gizlenmez)', () => {
      const domain = `${'a'.repeat(40)}.com`;
      expect(shortenUrlForDisplay(`https://${domain}/yol`)).toBe(domain);
      expect(shortenUrlForDisplay(`https://kap.org.tr.${domain}/yol`)).toBe(`…${domain}`);
    });

    it('PSL private son ekleri sayılır: kullanıcı alt alanı (evil.github.io) görünür', () => {
      const display = shortenUrlForDisplay(
        'https://kap-org-tr-bildirim-ozel-duyuru.evil.github.io/x'
      );
      expect(display.endsWith('evil.github.io')).toBe(true);
    });

    it('port da sonda görünür', () => {
      const display = shortenUrlForDisplay(
        'https://kap.org.tr.bildirim-ozel-duyuru-12345.evil.com:8443/x'
      );
      expect(display.endsWith('evil.com:8443')).toBe(true);
      expect(display).toContain('…');
    });
  });

  describe('path yüzde kodları çözülür (bidi/görünmez karakterler temizlenmiş)', () => {
    it('Türkçe karakterler okunur gösterilir', () => {
      expect(shortenUrlForDisplay('https://ornek.com/%C3%A7%C4%B1kt%C4%B1')).toBe(
        'ornek.com/çıktı'
      );
    });

    it.each([
      ['RLO (U+202E)', '%E2%80%AE'],
      ['sıfır genişlikli boşluk (U+200B)', '%E2%80%8B'],
      ['LRI (U+2066)', '%E2%81%A6'],
      ['Hangul dolgu (U+3164)', '%E3%85%A4'],
      ['kontrol karakteri (U+0000)', '%00'],
    ])('%s atılır', (_label, encoded) => {
      expect(shortenUrlForDisplay(`https://ornek.com/a${encoded}b`)).toBe('ornek.com/ab');
    });

    it('ayrılmış karakterler (%2F) çözülmez: yol yapısı değişmez', () => {
      expect(shortenUrlForDisplay('https://ornek.com/a%2Fb')).toBe('ornek.com/a%2Fb');
    });

    it('bozuk kodlama throw etmez, kodlu hâl kalır', () => {
      expect(shortenUrlForDisplay('https://ornek.com/%E0%A4%A')).toBe('ornek.com/%E0%A4%A');
    });

    it('kesme emoji’yi ortadan bölmez', () => {
      const display = shortenUrlForDisplay(`https://ornek.com/${'%F0%9F%93%88'.repeat(40)}`);
      expect(display).toBe(`ornek.com/${'📈'.repeat(21)}…`);
      // Yetim surrogate yok
      expect(display).not.toMatch(/[\uD800-\uDFFF]/u);
    });
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
