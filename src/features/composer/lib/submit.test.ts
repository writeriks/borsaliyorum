import { describe, expect, it } from 'vitest';

import { ErrorCode, fail, ok } from '@/lib/errors';

import { mapSubmitError, newClientRequestId, resolveClientRequest } from './submit';

describe('mapSubmitError (tasarım §1.7)', () => {
  it('istek sonuçlanmadıysa ya da sunucu hatasıysa genel hata + tekrar dene [SND-04]', () => {
    expect(mapSubmitError(null)).toEqual({ kind: 'generic' });
    expect(mapSubmitError(fail(ErrorCode.INTERNAL))).toEqual({ kind: 'generic' });
  });

  it('429 → hız sınırı [SND-05]', () => {
    expect(mapSubmitError(fail(ErrorCode.RATE_LIMITED, { retryAfter: 30 }))).toEqual({
      kind: 'rateLimited',
    });
  });

  it('401 → oturum [SND-06]', () => {
    expect(mapSubmitError(fail(ErrorCode.UNAUTHENTICATED))).toEqual({ kind: 'session' });
  });

  it('kısıtlı hesap kodları → restricted', () => {
    for (const code of [
      ErrorCode.ACCOUNT_SUSPENDED,
      ErrorCode.ONBOARDING_REQUIRED,
      ErrorCode.FORBIDDEN,
    ]) {
      expect(mapSubmitError(fail(code))).toEqual({ kind: 'restricted' });
    }
  });

  it('e-posta doğrulanmamış → unverified (paylaşım kilitlenmez: doğrulayıp tekrar dener)', () => {
    expect(mapSubmitError(fail(ErrorCode.EMAIL_NOT_VERIFIED))).toEqual({ kind: 'unverified' });
  });

  it('CONFLICT → conflict (genel "tekrar dene" değil: aynı kimlikle yeniden deneme döngüsü yok)', () => {
    expect(mapSubmitError(fail(ErrorCode.CONFLICT))).toEqual({ kind: 'conflict' });
  });

  it('doğrulama hataları kod ve meta ile', () => {
    expect(mapSubmitError(fail(ErrorCode.UNKNOWN_CASHTAG, { tickers: ['ZZZZ'] }))).toEqual({
      kind: 'validation',
      code: 'UNKNOWN_CASHTAG',
      meta: { tickers: ['ZZZZ'] },
    });
    expect(mapSubmitError(fail(ErrorCode.SPONSORED_CASHTAG_BLOCKED))).toEqual({
      kind: 'validation',
      code: 'SPONSORED_CASHTAG_BLOCKED',
    });
  });

  it('yeni yasal sürüm kabul edilmemiş → kendi i18n mesajıyla (errors.LEGAL_ACCEPTANCE_REQUIRED)', () => {
    expect(mapSubmitError(fail(ErrorCode.LEGAL_ACCEPTANCE_REQUIRED))).toEqual({
      kind: 'validation',
      code: ErrorCode.LEGAL_ACCEPTANCE_REQUIRED,
    });
  });

  it('başarı hata değildir (savunma: genel)', () => {
    expect(mapSubmitError(ok({ id: 1 }))).toEqual({ kind: 'generic' });
  });
});

describe('newClientRequestId', () => {
  it('her çağrıda yeni UUID', () => {
    const a = newClientRequestId();
    const b = newClientRequestId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});

describe('resolveClientRequest (idempotency anahtarı yüke bağlı)', () => {
  const base = {
    text: 'Merhaba $THYAO',
    sentiment: 'bullish',
    isSponsored: false,
    previewUrl: null,
  } as const;
  let counter = 0;
  const createId = (): string => `id-${(counter += 1)}`;

  it('aynı yük → aynı kimlik', () => {
    const first = resolveClientRequest(null, base, createId);
    expect(resolveClientRequest(first, { ...base }, createId)).toBe(first);
  });

  it.each([
    ['metin', { text: 'Merhaba $ASELS' }],
    ['görüş', { sentiment: 'neutral' }],
    ['sponsorluk', { isSponsored: true }],
    ['önizleme', { previewUrl: 'https://ornek.com/a' }],
  ] as const)('%s değişince yeni kimlik', (_label, change) => {
    const first = resolveClientRequest(null, base, createId);
    const next = resolveClientRequest(first, { ...base, ...change }, createId);
    expect(next.id).not.toBe(first.id);
  });
});
