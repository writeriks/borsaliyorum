'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { getPathname } from '@/i18n/navigation';
import { type Locale, routing } from '@/i18n/routing';
import { ErrorCode, errorMessageKey, type Result } from '@/lib/errors';
import { LEGAL_ACCEPTANCE_HREF } from '@/lib/legal/versions';

/** Server Action sonucunun istemcide ne anlama geldiği (saf; unit testli). */
export type ActionOutcome<T> =
  | { readonly kind: 'ok'; readonly data: T }
  /** Oturum sona ermiş/iptal: yeniden giriş gerekir (auth-session UX kuralı 5). */
  | { readonly kind: 'session-expired' }
  | { readonly kind: 'onboarding-required' }
  /** Yasal metin paketinin yeni sürümü kabul edilmeden yazılamaz (/yasal/yeni-surum). */
  | { readonly kind: 'legal-acceptance-required' }
  | { readonly kind: 'error'; readonly error: ErrorCode };

export const interpretActionResult = <T>(result: Result<T>): ActionOutcome<T> => {
  if (result.ok) return { kind: 'ok', data: result.data };
  if (result.error === ErrorCode.UNAUTHENTICATED) return { kind: 'session-expired' };
  if (result.error === ErrorCode.ONBOARDING_REQUIRED) return { kind: 'onboarding-required' };
  if (result.error === ErrorCode.LEGAL_ACCEPTANCE_REQUIRED) {
    return { kind: 'legal-acceptance-required' };
  }
  return { kind: 'error', error: result.error };
};

/** Oturumu düşen kullanıcıyı girişe, bulunduğu sayfaya dönecek şekilde gönderen adres. */
export const expiredSessionLoginHref = (currentPath: string, locale: Locale): string =>
  getPathname({ href: { pathname: '/giris', query: { next: currentPath } }, locale });

export type HandleActionOptions = {
  /**
   * Oturum düşmesinde ve yasal kabul ekranına yönlendirmede, yönlendirmeden hemen önce
   * çağrılır: çağıran taslağını (ör. yazılmakta olan gönderi) kalıcı yere yazar. Taslak burada silinmez; `SIGNED_OUT_EVENT` de yayınlanmaz (çıkış değil).
   */
  readonly onSessionExpired?: () => void;
};

export type HandleActionResult = <T>(result: Result<T>, options?: HandleActionOptions) => T | null;

const toLocale = (value: string): Locale =>
  (routing.locales as readonly string[]).includes(value)
    ? (value as Locale)
    : routing.defaultLocale;

/**
 * Ortak istemci action-result işleyicisi (auth-session UX kuralı 5). Başarıda veriyi döner;
 * aksi halde kullanıcıya bildirir ve null döner:
 * - `UNAUTHENTICATED` → "Oturumun sona erdi" toast'ı + `/giris?next=<bulunduğu sayfa>`;
 *   taslak korunur (`onSessionExpired` ile kaydedilir, hiçbir şey silinmez)
 * - `ONBOARDING_REQUIRED` → `/hos-geldin`
 * - `LEGAL_ACCEPTANCE_REQUIRED` → açıklayıcı toast + `/yasal/yeni-surum?next=<bulunduğu sayfa>`
 * - diğer kodlar → `errors.<KOD>` mesajıyla toast (teknik ayrıntı yok)
 */
export const useActionResult = (): HandleActionResult => {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const locale = toLocale(useLocale());

  return useCallback(
    <T>(result: Result<T>, options?: HandleActionOptions): T | null => {
      const outcome = interpretActionResult(result);
      switch (outcome.kind) {
        case 'ok':
          return outcome.data;
        case 'session-expired': {
          options?.onSessionExpired?.();
          toast.error(t('auth.sessionExpired'));
          const here = search ? `${pathname}?${search}` : pathname;
          router.push(expiredSessionLoginHref(here, locale));
          return null;
        }
        case 'onboarding-required':
          router.push(getPathname({ href: '/hos-geldin', locale }));
          return null;
        case 'legal-acceptance-required': {
          options?.onSessionExpired?.();
          toast.error(t(errorMessageKey(ErrorCode.LEGAL_ACCEPTANCE_REQUIRED)));
          const here = search ? `${pathname}?${search}` : pathname;
          router.push(
            getPathname({
              href: { pathname: LEGAL_ACCEPTANCE_HREF, query: { next: here } },
              locale,
            })
          );
          return null;
        }
        default:
          toast.error(t(errorMessageKey(outcome.error)));
          return null;
      }
    },
    [locale, pathname, router, search, t]
  );
};
