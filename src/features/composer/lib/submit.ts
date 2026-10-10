import { ErrorCode } from '@/lib/errors';

import type { SubmitErrorKind, SubmitResult } from '../types';

const RESTRICTED: ReadonlySet<ErrorCode> = new Set([
  ErrorCode.ACCOUNT_SUSPENDED,
  ErrorCode.EMAIL_NOT_VERIFIED,
  ErrorCode.ONBOARDING_REQUIRED,
  ErrorCode.FORBIDDEN,
]);

/**
 * Gönderme sonucu → composer'daki hata bandı (tasarım §1.7). `null` = istek hiç sonuçlanmadı
 * (ağ hatası/exception): içerik korunur, "Tekrar dene" aynı `clientRequestId` ile yeniden gönderir.
 */
export const mapSubmitError = (result: SubmitResult | null): SubmitErrorKind => {
  if (result === null || result.ok) return { kind: 'generic' };
  const { error, meta } = result;
  if (error === ErrorCode.INTERNAL || error === ErrorCode.CONFLICT) return { kind: 'generic' };
  if (error === ErrorCode.RATE_LIMITED) return { kind: 'rateLimited' };
  if (error === ErrorCode.UNAUTHENTICATED) return { kind: 'session' };
  if (RESTRICTED.has(error)) return { kind: 'restricted' };
  return meta === undefined
    ? { kind: 'validation', code: error }
    : { kind: 'validation', code: error, meta };
};

/** Çift gönderim idempotency anahtarı (ADR-0002 Karar 7, `Post.clientRequestId` UNIQUE). */
export const newClientRequestId = (): string => crypto.randomUUID();
