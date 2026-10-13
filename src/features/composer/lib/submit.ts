import { ErrorCode } from '@/lib/errors';

import type { Sentiment, SubmitErrorKind, SubmitResult } from '../types';

const RESTRICTED: ReadonlySet<ErrorCode> = new Set([
  ErrorCode.ACCOUNT_SUSPENDED,
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
  if (error === ErrorCode.INTERNAL) return { kind: 'generic' };
  if (error === ErrorCode.CONFLICT) return { kind: 'conflict' };
  if (error === ErrorCode.EMAIL_NOT_VERIFIED) return { kind: 'unverified' };
  if (error === ErrorCode.RATE_LIMITED) return { kind: 'rateLimited' };
  if (error === ErrorCode.UNAUTHENTICATED) return { kind: 'session' };
  if (RESTRICTED.has(error)) return { kind: 'restricted' };
  return meta === undefined
    ? { kind: 'validation', code: error }
    : { kind: 'validation', code: error, meta };
};

/** Çift gönderim idempotency anahtarı (ADR-0002 Karar 7, `Post.clientRequestId` UNIQUE). */
export const newClientRequestId = (): string => crypto.randomUUID();

/** Sunucuya gidecek ve kaydı belirleyen alanlar; yorumda yalnızca metin anlamlı. */
export type SubmitPayloadFields = {
  text: string;
  sentiment: Sentiment;
  isSponsored: boolean;
  previewUrl: string | null;
};

export type ClientRequest = { id: string; payloadKey: string };

export const submitPayloadKey = (fields: SubmitPayloadFields): string =>
  JSON.stringify([fields.text, fields.sentiment, fields.isSponsored, fields.previewUrl]);

/**
 * Aynı yük ile yeniden deneme aynı kimliği taşır (sunucu çift kayıt açmaz). Yükün herhangi bir
 * alanı değiştiyse yeni kimlik: aksi halde sunucu eski isteğin kaydını döndürür ve ör. sonradan
 * açılan sponsorluk etiketi sessizce düşer.
 */
export const resolveClientRequest = (
  previous: ClientRequest | null,
  fields: SubmitPayloadFields,
  createId: () => string = newClientRequestId
): ClientRequest => {
  const payloadKey = submitPayloadKey(fields);
  return previous?.payloadKey === payloadKey ? previous : { id: createId(), payloadKey };
};
