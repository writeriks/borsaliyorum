import { describe, expect, it } from 'vitest';

import { isSameSite, registrableDomainOf } from './site';

describe('registrableDomainOf', () => {
  it.each([
    ['haber.ornek.com.tr', 'ornek.com.tr'],
    ['www.kap.org.tr', 'kap.org.tr'],
    ['bit.ly', 'bit.ly'],
    ['WWW.Example.COM.', 'example.com'],
    ['kullanici.github.io', 'kullanici.github.io'],
    ['93.184.216.34', '93.184.216.34'],
    ['[2001:db8::1]', '2001:db8::1'],
  ])('%s → %s', (host, expected) => {
    expect(registrableDomainOf(host)).toBe(expected);
  });
});

describe('isSameSite', () => {
  it.each([
    ['ornek.com.tr', 'haber.ornek.com.tr', true],
    ['www.example.com', 'example.com', true],
    ['bit.ly', 'kotu.com', false],
    ['ornek.com.tr', 'baska.com.tr', false],
    // Ortak son ek (PSL private) farklı sahipler demektir
    ['a.github.io', 'b.github.io', false],
    ['127.0.0.1', '127.0.0.2', false],
  ])('%s ~ %s → %s', (a, b, expected) => {
    expect(isSameSite(a, b)).toBe(expected);
  });
});
