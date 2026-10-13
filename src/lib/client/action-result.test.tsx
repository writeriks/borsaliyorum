import { renderHook } from '@testing-library/react';
import type * as NextNavigation from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SIGNED_OUT_EVENT } from '@/lib/auth-events';
import { fail, ok } from '@/lib/errors';

import { MESSAGES } from '../../../tests/utils/render';

import { expiredSessionLoginHref, interpretActionResult, useActionResult } from './action-result';

const push = vi.fn();
let pathname = '/akis';
let search = 'sekme=son';
vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof NextNavigation>()),
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));

const wrapper = (locale: 'tr' | 'en') => {
  const Wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone='Europe/Istanbul'>
      {children}
    </NextIntlClientProvider>
  );
  return Wrapper;
};

beforeEach(() => {
  push.mockReset();
  toastError.mockReset();
  pathname = '/akis';
  search = 'sekme=son';
});

describe('interpretActionResult', () => {
  it('kodları sınıflandırır', () => {
    expect(interpretActionResult(ok(1))).toEqual({ kind: 'ok', data: 1 });
    expect(interpretActionResult(fail('UNAUTHENTICATED'))).toEqual({ kind: 'session-expired' });
    expect(interpretActionResult(fail('ONBOARDING_REQUIRED'))).toEqual({
      kind: 'onboarding-required',
    });
    expect(interpretActionResult(fail('LEGAL_ACCEPTANCE_REQUIRED'))).toEqual({
      kind: 'legal-acceptance-required',
    });
    expect(interpretActionResult(fail('RATE_LIMITED'))).toEqual({
      kind: 'error',
      error: 'RATE_LIMITED',
    });
  });

  it("giriş adresi bulunduğu sayfayı next'e koyar; /en'de önek tek", () => {
    expect(expiredSessionLoginHref('/akis?sekme=son', 'tr')).toBe(
      '/giris?next=%2Fakis%3Fsekme%3Dson'
    );
    expect(expiredSessionLoginHref('/en/akis', 'en')).toBe('/en/giris?next=%2Fen%2Fakis');
  });
});

describe('useActionResult', () => {
  it('başarıda veriyi döner, hiçbir şey göstermez', () => {
    const { result } = renderHook(() => useActionResult(), { wrapper: wrapper('tr') });
    expect(result.current(ok({ postId: 3 }))).toEqual({ postId: 3 });
    expect(toastError).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('UNAUTHENTICATED → "Oturumun sona erdi" + girişe next ile; taslak kaydedilir, silinmez', () => {
    const signedOut = vi.fn();
    window.addEventListener(SIGNED_OUT_EVENT, signedOut);
    const order: string[] = [];
    const { result } = renderHook(() => useActionResult(), { wrapper: wrapper('tr') });
    push.mockImplementation(() => order.push('navigate'));

    expect(
      result.current(fail('UNAUTHENTICATED'), { onSessionExpired: () => order.push('save-draft') })
    ).toBeNull();

    expect(toastError).toHaveBeenCalledWith(MESSAGES.tr.auth.sessionExpired);
    expect(push).toHaveBeenCalledWith('/giris?next=%2Fakis%3Fsekme%3Dson');
    expect(order).toEqual(['save-draft', 'navigate']);
    // Oturum düşmesi çıkış değildir: taslakları silen olay yayınlanmaz
    expect(signedOut).not.toHaveBeenCalled();
    window.removeEventListener(SIGNED_OUT_EVENT, signedOut);
  });

  it('/en sayfasında yönlendirme tek önekli', () => {
    pathname = '/en/akis';
    search = '';
    const { result } = renderHook(() => useActionResult(), { wrapper: wrapper('en') });
    result.current(fail('UNAUTHENTICATED'));
    expect(toastError).toHaveBeenCalledWith(MESSAGES.en.auth.sessionExpired);
    expect(push).toHaveBeenCalledWith('/en/giris?next=%2Fen%2Fakis');
  });

  it('ONBOARDING_REQUIRED → /hos-geldin; diğer hatalar i18n mesajıyla toast', () => {
    const { result } = renderHook(() => useActionResult(), { wrapper: wrapper('tr') });
    result.current(fail('ONBOARDING_REQUIRED'));
    expect(push).toHaveBeenCalledWith('/hos-geldin');
    result.current(fail('EMAIL_NOT_VERIFIED'));
    expect(toastError).toHaveBeenCalledWith(MESSAGES.tr.errors.EMAIL_NOT_VERIFIED);
  });

  it('LEGAL_ACCEPTANCE_REQUIRED → açıklayıcı toast + kabul ekranı (bulunduğu sayfaya dönecek şekilde)', () => {
    const { result } = renderHook(() => useActionResult(), { wrapper: wrapper('tr') });
    const onSessionExpired = vi.fn();
    expect(result.current(fail('LEGAL_ACCEPTANCE_REQUIRED'), { onSessionExpired })).toBeNull();
    expect(toastError).toHaveBeenCalledWith(MESSAGES.tr.errors.LEGAL_ACCEPTANCE_REQUIRED);
    expect(push).toHaveBeenCalledWith('/yasal/yeni-surum?next=%2Fakis%3Fsekme%3Dson');
    // Taslak, oturum düşmesindeki gibi kaydedilir (sayfadan ayrılınıyor)
    expect(onSessionExpired).toHaveBeenCalledOnce();

    pathname = '/en/akis';
    search = '';
    const en = renderHook(() => useActionResult(), { wrapper: wrapper('en') });
    en.result.current(fail('LEGAL_ACCEPTANCE_REQUIRED'));
    expect(push).toHaveBeenLastCalledWith('/en/yasal/yeni-surum?next=%2Fen%2Fakis');
  });
});
