import { type ErrorCode, isErrorCode } from '@/lib/errors';

/**
 * Firebase istemci hata kodları → i18n anahtarı (`auth.errors.<key>`). Ham Firebase mesajı
 * asla gösterilmez ve hangi alanın yanlış olduğu söylenmez: "kullanıcı yok" ile "şifre yanlış"
 * aynı mesaja düşer (hesap varlığı sızmasın, auth-session UX kuralı 4).
 */
export const AuthErrorKey = {
  INVALID_CREDENTIALS: 'invalidCredentials',
  SIGNUP_UNAVAILABLE: 'signupUnavailable',
  WEAK_PASSWORD: 'weakPassword',
  INVALID_EMAIL: 'invalidEmail',
  TOO_MANY_REQUESTS: 'tooManyRequests',
  NETWORK: 'network',
  POPUP_BLOCKED: 'popupBlocked',
  OTHER_PROVIDER: 'otherProvider',
  REAUTH: 'reauth',
  SUSPENDED: 'suspended',
  GENERIC: 'generic',
} as const;
export type AuthErrorKey = (typeof AuthErrorKey)[keyof typeof AuthErrorKey];

/** Kullanıcının kendi iptal ettiği işlemler: mesaj gösterilmez, form eski haline döner. */
const SILENT_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

const CODE_TO_KEY: Readonly<Record<string, AuthErrorKey>> = {
  'auth/invalid-credential': AuthErrorKey.INVALID_CREDENTIALS,
  'auth/invalid-login-credentials': AuthErrorKey.INVALID_CREDENTIALS,
  'auth/wrong-password': AuthErrorKey.INVALID_CREDENTIALS,
  'auth/user-not-found': AuthErrorKey.INVALID_CREDENTIALS,
  // Devre dışı hesap da aynı mesaj: aksi halde hesabın var olduğu anlaşılır
  'auth/user-disabled': AuthErrorKey.INVALID_CREDENTIALS,
  'auth/email-already-in-use': AuthErrorKey.SIGNUP_UNAVAILABLE,
  'auth/weak-password': AuthErrorKey.WEAK_PASSWORD,
  'auth/password-does-not-meet-requirements': AuthErrorKey.WEAK_PASSWORD,
  'auth/invalid-email': AuthErrorKey.INVALID_EMAIL,
  'auth/missing-email': AuthErrorKey.INVALID_EMAIL,
  'auth/too-many-requests': AuthErrorKey.TOO_MANY_REQUESTS,
  'auth/network-request-failed': AuthErrorKey.NETWORK,
  'auth/popup-blocked': AuthErrorKey.POPUP_BLOCKED,
  'auth/account-exists-with-different-credential': AuthErrorKey.OTHER_PROVIDER,
  'auth/requires-recent-login': AuthErrorKey.REAUTH,
};

/** Firebase hatasından anahtar; kullanıcı iptal ettiyse null (mesaj yok). */
export const authErrorKeyFromFirebase = (error: unknown): AuthErrorKey | null => {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code !== 'string') return AuthErrorKey.GENERIC;
  if (SILENT_CODES.has(code)) return null;
  return CODE_TO_KEY[code] ?? AuthErrorKey.GENERIC;
};

/** Sunucunun (`/api/auth/session`) ErrorCode'u → anahtar. */
export const authErrorKeyFromServer = (error: unknown): AuthErrorKey => {
  if (!isErrorCode(error)) return AuthErrorKey.GENERIC;
  const map: Partial<Record<ErrorCode, AuthErrorKey>> = {
    UNAUTHENTICATED: AuthErrorKey.INVALID_CREDENTIALS,
    REAUTH_REQUIRED: AuthErrorKey.REAUTH,
    ACCOUNT_SUSPENDED: AuthErrorKey.SUSPENDED,
    RATE_LIMITED: AuthErrorKey.TOO_MANY_REQUESTS,
  };
  return map[error] ?? AuthErrorKey.GENERIC;
};
