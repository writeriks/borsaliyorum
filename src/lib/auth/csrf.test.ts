import { describe, expect, it } from 'vitest';

import {
  generateCsrfToken,
  isSameOriginRequest,
  isWellFormedCsrfToken,
  verifyCsrfToken,
} from './csrf';

const headers = (values: Record<string, string>): Headers => new Headers(values);

describe('CSRF double-submit', () => {
  it('üretilen token biçimli ve her seferinde farklı', () => {
    const a = generateCsrfToken();
    const b = generateCsrfToken();
    expect(isWellFormedCsrfToken(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('çerez ve başlık aynıysa kabul', () => {
    const token = generateCsrfToken();
    expect(verifyCsrfToken(token, token)).toBe(true);
  });

  it.each([
    ['başlık yok', 'cookie', null],
    ['çerez yok', null, 'header'],
    ['farklı token', 'other', 'header'],
    ['biçimsiz ama eşit', 'abc', 'abc'],
    ['ikisi de boş', '', ''],
  ])('reddeder: %s', (_label, cookie, header) => {
    const real = generateCsrfToken();
    const resolve = (value: string | null): string | null =>
      value === 'cookie' || value === 'header'
        ? real
        : value === 'other'
          ? generateCsrfToken()
          : value;
    expect(verifyCsrfToken(resolve(cookie), resolve(header))).toBe(false);
  });
});

describe('Origin kontrolü', () => {
  it('aynı host (https) kabul', () => {
    expect(
      isSameOriginRequest(headers({ origin: 'https://borsaliyorum.com', host: 'borsaliyorum.com' }))
    ).toBe(true);
  });

  it("Vercel'in x-forwarded-host'unu kullanır", () => {
    expect(
      isSameOriginRequest(
        headers({
          origin: 'https://beta.borsaliyorum.com',
          host: 'internal.vercel',
          'x-forwarded-host': 'beta.borsaliyorum.com',
        })
      )
    ).toBe(true);
  });

  it('localhost http (E2E) kabul', () => {
    expect(
      isSameOriginRequest(headers({ origin: 'http://localhost:3100', host: 'localhost:3100' }))
    ).toBe(true);
  });

  it.each<[string, Record<string, string>]>([
    ['başka site', { origin: 'https://evil.example', host: 'borsaliyorum.com' }],
    ['Origin yok', { host: 'borsaliyorum.com' }],
    ['alt alan adı', { origin: 'https://x.borsaliyorum.com', host: 'borsaliyorum.com' }],
    ['localhost dışı http', { origin: 'http://borsaliyorum.com', host: 'borsaliyorum.com' }],
    ['null origin', { origin: 'null', host: 'borsaliyorum.com' }],
    [
      'Sec-Fetch-Site cross-site',
      {
        origin: 'https://borsaliyorum.com',
        host: 'borsaliyorum.com',
        'sec-fetch-site': 'cross-site',
      },
    ],
    [
      'Sec-Fetch-Site same-site (alt alan)',
      {
        origin: 'https://borsaliyorum.com',
        host: 'borsaliyorum.com',
        'sec-fetch-site': 'same-site',
      },
    ],
  ])('reddeder: %s', (_label, values) => {
    expect(isSameOriginRequest(headers(values))).toBe(false);
  });
});
