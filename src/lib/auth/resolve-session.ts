import type { Logger } from '@/lib/logger';

import { isSessionInvalidated } from './rules';
import { ANONYMOUS_SESSION, type SessionState } from './types';
import { type SessionUserRecord, toSessionUser } from './user-record';

/** `verifySessionCookie` dönüşünün kullandığımız kısmı. */
export type SessionClaims = {
  readonly uid: string;
  readonly auth_time: number;
  readonly email?: string;
  readonly email_verified?: boolean;
  readonly name?: string;
};

export type ResolveSessionDeps = {
  readonly verifySessionCookie: (cookie: string, checkRevoked: boolean) => Promise<SessionClaims>;
  readonly findUserByFirebaseUid: (uid: string) => Promise<SessionUserRecord | null>;
  readonly log: Logger;
};

/**
 * Kesin geçersizlik bildiren Firebase hata kodları → anonim. Bunların dışındaki hatalar
 * (ağ, Firebase kesintisi) kullanıcıyı çıkış yapmış saymaz: imza + süre yerelde doğrulanır ve
 * `sessionsValidAfter` kontrolü yine uygulanır (bkz. `resolveSession`).
 */
const INVALID_SESSION_CODES = new Set([
  'auth/session-cookie-revoked',
  'auth/session-cookie-expired',
  'auth/argument-error',
  'auth/invalid-argument',
  'auth/user-disabled',
  'auth/user-not-found',
  'auth/invalid-session-cookie-duration',
]);

const errorCode = (error: unknown): string | null => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
};

const isDefinitelyInvalid = (error: unknown): boolean => {
  const code = errorCode(error);
  return code !== null && INVALID_SESSION_CODES.has(code);
};

const verify = async (cookie: string, deps: ResolveSessionDeps): Promise<SessionClaims | null> => {
  try {
    // checkRevoked: Firebase konsolundan iptal, şifre değişimi, devre dışı hesap da anında etkili
    return await deps.verifySessionCookie(cookie, true);
  } catch (error) {
    if (isDefinitelyInvalid(error)) return null;
    deps.log.warn('session revocation check unavailable; falling back to local verify', {
      code: errorCode(error),
    });
  }
  try {
    return await deps.verifySessionCookie(cookie, false);
  } catch (error) {
    if (!isDefinitelyInvalid(error)) {
      deps.log.error('session cookie verification failed', { code: errorCode(error) });
    }
    return null;
  }
};

/**
 * `__session` çerezinden oturum durumu (ADR-0001 Karar 5):
 * - çerez geçersiz/süresi dolmuş/iptal → anonim
 * - DB'de kullanıcı yok ya da `onboardedAt` boş → needs-onboarding (placeholder ad üretilmez)
 * - `status != active` ya da `auth_time < sessionsValidAfter` (çıkış/ban) → anonim
 */
export const resolveSession = async (
  cookie: string,
  deps: ResolveSessionDeps
): Promise<SessionState> => {
  const claims = await verify(cookie, deps);
  if (!claims) return ANONYMOUS_SESSION;

  const record = await deps.findUserByFirebaseUid(claims.uid);
  if (record) {
    if (record.status !== 'active') return ANONYMOUS_SESSION;
    if (isSessionInvalidated(claims.auth_time, record.sessionsValidAfter)) {
      return ANONYMOUS_SESSION;
    }
    if (record.onboardedAt !== null) {
      return {
        status: 'authenticated',
        user: toSessionUser(record),
        firebaseUid: claims.uid,
        authTime: claims.auth_time,
      };
    }
  }

  const email = claims.email ?? record?.email;
  // E-postasız Firebase hesabı (telefon vb.) desteklenmiyor; oturum açılırken de reddedilir
  if (!email) return ANONYMOUS_SESSION;

  return {
    status: 'needs-onboarding',
    authTime: claims.auth_time,
    identity: {
      firebaseUid: claims.uid,
      email,
      emailVerified: claims.email_verified ?? record?.isEmailVerified ?? false,
      suggestedDisplayName: record?.displayName ?? claims.name ?? null,
      existingUserId: record?.userId ?? null,
    },
  };
};
