import { describe, expect, it } from 'vitest';

import { ErrorCode, fail, ok } from '@/lib/errors';

import { mapSubmitError, newClientRequestId } from './submit';

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
      ErrorCode.EMAIL_NOT_VERIFIED,
      ErrorCode.ONBOARDING_REQUIRED,
      ErrorCode.FORBIDDEN,
    ]) {
      expect(mapSubmitError(fail(code))).toEqual({ kind: 'restricted' });
    }
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
