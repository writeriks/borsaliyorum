import type { Logger } from '@/lib/logger';

import { ErrorCode, fail, ok, type Result } from '@/lib/errors';

import { isAuthTimeFresh, isSessionInvalidated, MAX_AUTH_AGE_MS } from './rules';
import {
  ANONYMOUS_SESSION,
  anonymousErrorCode,
  type SessionState,
  SUSPENDED_SESSION,
} from './types';

export type AuthenticatedSession = Extract<SessionState, { status: 'authenticated' }>;
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

const errorCode = (error: unknown): string | null => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
};

/** Çerez geçersizliği beklenen bir durumdur (süresi dolmuş, iptal); yalnızca diğerleri loglanır. */
const EXPECTED_INVALID_PREFIX = 'auth/';

/**
 * Her istekteki doğrulama (ADR-0001 Karar 5): `checkRevoked=false` → yerel imza + süre
 * kontrolü, Firebase'e ağ çağrısı yok. İptal (çıkış/ban) DB'deki `sessionsValidAfter` ve
 * `status` ile anında uygulanır. Hata → anonim; ikinci, daha gevşek bir deneme yapılmaz.
 */
const verify = async (cookie: string, deps: ResolveSessionDeps): Promise<SessionClaims | null> => {
  try {
    return await deps.verifySessionCookie(cookie, false);
  } catch (error) {
    if (!errorCode(error)?.startsWith(EXPECTED_INVALID_PREFIX)) {
      deps.log.error('session cookie verification failed', { code: errorCode(error) });
    }
    return null;
  }
};

/**
 * `__session` çerezinden oturum durumu (ADR-0001 Karar 5):
 * - çerez geçersiz/süresi dolmuş/iptal → anonim
 * - DB'de kullanıcı yok ya da `onboardedAt` boş → needs-onboarding (placeholder ad üretilmez)
 * - `status = suspended` → anonim + `reason: 'suspended'` (Server Action'lar `ACCOUNT_SUSPENDED`)
 * - `status = deleted` ya da `auth_time < sessionsValidAfter` (çıkış/ban) → anonim
 */
export const resolveSession = async (
  cookie: string,
  deps: ResolveSessionDeps
): Promise<SessionState> => {
  const claims = await verify(cookie, deps);
  if (!claims) return ANONYMOUS_SESSION;
  return sessionFromClaims(claims, deps);
};

const sessionFromClaims = async (
  claims: SessionClaims,
  deps: ResolveSessionDeps
): Promise<SessionState> => {
  const record = await deps.findUserByFirebaseUid(claims.uid);
  if (record) {
    if (record.status === 'suspended') return SUSPENDED_SESSION;
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

/**
 * Hassas işlemler (şifre/e-posta değiştirme, hesap silme) için sıkı doğrulama (ADR-0001
 * Karar 5): `checkRevoked=true` (Firebase'e ağ çağrısı; konsoldan iptal, şifre değişimi,
 * devre dışı hesap anında etkili) + taze giriş (`auth_time` ≤ 5 dk) + DB kontrolleri.
 * Firebase'e ulaşılamazsa yerel doğrulamaya **düşülmez**: `REAUTH_REQUIRED` (fail-closed).
 */
export const verifySensitiveSession = async (
  cookie: string,
  deps: ResolveSessionDeps,
  now: Date,
  maxAuthAgeMs: number = MAX_AUTH_AGE_MS
): Promise<Result<AuthenticatedSession>> => {
  let claims: SessionClaims;
  try {
    claims = await deps.verifySessionCookie(cookie, true);
  } catch (error) {
    if (!errorCode(error)?.startsWith(EXPECTED_INVALID_PREFIX)) {
      deps.log.warn('sensitive session check unavailable', { code: errorCode(error) });
    }
    return fail(ErrorCode.REAUTH_REQUIRED);
  }
  const session = await sessionFromClaims(claims, deps);
  if (session.status === 'anonymous') return fail(anonymousErrorCode(session));
  if (session.status === 'needs-onboarding') return fail(ErrorCode.ONBOARDING_REQUIRED);
  if (!isAuthTimeFresh(claims.auth_time, now, maxAuthAgeMs)) {
    return fail(ErrorCode.REAUTH_REQUIRED);
  }
  return ok(session);
};
