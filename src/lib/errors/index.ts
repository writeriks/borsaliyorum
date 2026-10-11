import { logger as defaultLogger, type Logger } from '@/lib/logger';

/**
 * Uygulama genelindeki hata kodları. Kullanıcıya ham hata gösterilmez; her kod
 * `messages/*.json` içinde `errors.<KOD>` anahtarıyla çevrilir.
 * Özelliğe özgü kodlar (ör. `UNKNOWN_CASHTAG`) ilgili dilimde buraya eklenir.
 */
export const ErrorCode = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
  // --- Auth (S5) ---
  /** Kimlik doğrulandı ama hesap henüz kullanıcı adı seçmedi (onboarding). */
  ONBOARDING_REQUIRED: 'ONBOARDING_REQUIRED',
  /** E-posta doğrulanmamış kullanıcı yazamaz (spam ve 5651 sorumluluğu). */
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  /** Giriş 5 dakikadan eski: oturum açmak/hassas işlem için yeniden giriş gerekir. */
  REAUTH_REQUIRED: 'REAUTH_REQUIRED',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  USERNAME_RESERVED: 'USERNAME_RESERVED',
  /**
   * Bu e-posta başka bir Firebase kimliğine bağlı bir hesapta kayıtlı (v1'de aynı e-postayla
   * farklı giriş yöntemiyle açılmış hesap). v1 kararı: otomatik birleştirme yok; kullanıcıya
   * açık mesaj + destek iletişimi.
   */
  ACCOUNT_EMAIL_CONFLICT: 'ACCOUNT_EMAIL_CONFLICT',
  /** Yasal metin paketinin (Koşullar …) yeni sürümü kabul edilmeden yazılamaz (okuma serbest). */
  LEGAL_ACCEPTANCE_REQUIRED: 'LEGAL_ACCEPTANCE_REQUIRED',
  // --- Gönderi/yorum yazma (ADR-0002 Karar 7); composer (S8) bunları kullanıcı mesajına eşler ---
  CONTENT_EMPTY: 'CONTENT_EMPTY',
  CONTENT_TOO_LONG: 'CONTENT_TOO_LONG',
  UNKNOWN_CASHTAG: 'UNKNOWN_CASHTAG',
  SPONSORED_CASHTAG_BLOCKED: 'SPONSORED_CASHTAG_BLOCKED',
  TOO_MANY_ENTITIES: 'TOO_MANY_ENTITIES',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ERROR_CODES: readonly ErrorCode[] = Object.values(ErrorCode);

export const isErrorCode = (value: unknown): value is ErrorCode =>
  typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);

/** Hata ile birlikte istemciye gidebilecek, kişisel veri içermeyen ek bilgi. */
export type ErrorMeta = Readonly<Record<string, string | number | boolean | readonly string[]>>;

export type Success<T> = { readonly ok: true; readonly data: T };
export type Failure = { readonly ok: false; readonly error: ErrorCode; readonly meta?: ErrorMeta };

/** Server Action ve DAL dönüş tipi (coding-standards). */
export type Result<T> = Success<T> | Failure;

export const ok = <T>(data: T): Success<T> => ({ ok: true, data });

export const fail = (error: ErrorCode, meta?: ErrorMeta): Failure =>
  meta === undefined ? { ok: false, error } : { ok: false, error, meta };

/** Beklenen (iş kuralı) hatalarını taşımak için; mesajı kullanıcıya gösterilmez. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly meta: ErrorMeta | undefined;

  constructor(
    code: ErrorCode,
    options: { message?: string; meta?: ErrorMeta; cause?: unknown } = {}
  ) {
    super(options.message ?? code, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.meta = options.meta;
  }
}

/**
 * Yakalanan herhangi bir hatayı `Failure`'a çevirir. `AppError` kodunu korur; beklenmeyen
 * hatalar loglanır (yutulmaz) ve dışarıya yalnızca `INTERNAL` olarak çıkar.
 */
export const toFailure = (error: unknown, log: Logger = defaultLogger): Failure => {
  if (error instanceof AppError) return fail(error.code, error.meta);
  log.error('unexpected error', { err: error });
  return fail(ErrorCode.INTERNAL);
};

/** i18n anahtarı: `t(errorMessageKey(code))` ile `errors` namespace'i dışından kullanılır. */
export const errorMessageKey = (code: ErrorCode): `errors.${ErrorCode}` => `errors.${code}`;
