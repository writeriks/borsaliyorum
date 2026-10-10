import type { PrismaClient } from '@/generated/prisma/client';
import { recordContentEvent } from '@/lib/audit/content-event';
import { ErrorCode, fail, ok, type Result } from '@/lib/errors';
import type { Logger } from '@/lib/logger';
import type { RequestMeta } from '@/lib/request-meta';

import { SESSION_MAX_AGE_MS } from './cookies';
import { isAuthTimeFresh, isSessionInvalidated } from './rules';
import { type ClientSession, toClientUser } from './types';
import { sessionUserSelect, toSessionUser } from './user-record';

/** `verifyIdToken` dönüşünün kullandığımız kısmı. */
export type IdTokenClaims = {
  readonly uid: string;
  readonly auth_time: number;
  readonly email?: string;
  readonly email_verified?: boolean;
};

export type CreateSessionDeps = {
  readonly verifyIdToken: (idToken: string, checkRevoked: boolean) => Promise<IdTokenClaims>;
  readonly createSessionCookie: (idToken: string, expiresInMs: number) => Promise<string>;
  readonly db: PrismaClient;
  /** IP şifreleme anahtarı; yalnızca ContentEvent yazılırken istenir. */
  readonly ipKey: () => Uint8Array;
  readonly now: () => Date;
  readonly log: Logger;
};

export type CreatedSession = {
  readonly cookie: string;
  readonly session: Exclude<ClientSession, { status: 'anonymous' }>;
};

const errorCode = (error: unknown): string | null => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
};

/**
 * ID token → 14 günlük session cookie (auth-session akışı). Kayıt da buradan geçer ama DB
 * satırı burada **oluşturulmaz**: yeni hesap `needs-onboarding` döner, satır kullanıcı adı
 * seçilince `completeOnboarding`'de yazılır (ADR-0001: placeholder kullanıcı adı yok).
 *
 * Mevcut kullanıcı için `isEmailVerified` token'dan tazelenir ve `auth.login` ContentEvent'i
 * (şifreli IP ile) yazılır.
 */
export const createSessionFromIdToken = async (
  idToken: string,
  meta: RequestMeta,
  deps: CreateSessionDeps
): Promise<Result<CreatedSession>> => {
  let claims: IdTokenClaims;
  try {
    claims = await deps.verifyIdToken(idToken, true);
  } catch (error) {
    const code = errorCode(error);
    if (code === 'auth/id-token-expired') return fail(ErrorCode.REAUTH_REQUIRED);
    if (code?.startsWith('auth/')) return fail(ErrorCode.UNAUTHENTICATED);
    deps.log.error('verifyIdToken failed', { err: error });
    return fail(ErrorCode.INTERNAL);
  }

  // Eski (ör. çalınmış ya da uzun süre açık kalmış) bir token'dan 14 günlük oturum üretilmesin
  if (!isAuthTimeFresh(claims.auth_time, deps.now())) return fail(ErrorCode.REAUTH_REQUIRED);
  if (!claims.email) return fail(ErrorCode.VALIDATION);

  const record = await deps.db.user.findUnique({
    where: { firebaseUserId: claims.uid },
    select: sessionUserSelect,
  });

  if (record && record.status !== 'active') return fail(ErrorCode.ACCOUNT_SUSPENDED);
  if (record && isSessionInvalidated(claims.auth_time, record.sessionsValidAfter)) {
    return fail(ErrorCode.REAUTH_REQUIRED);
  }

  let cookie: string;
  try {
    cookie = await deps.createSessionCookie(idToken, SESSION_MAX_AGE_MS);
  } catch (error) {
    deps.log.error('createSessionCookie failed', { code: errorCode(error) });
    return errorCode(error)?.startsWith('auth/')
      ? fail(ErrorCode.UNAUTHENTICATED)
      : fail(ErrorCode.INTERNAL);
  }

  if (!record) return ok({ cookie, session: { status: 'needs-onboarding' } });

  const emailVerified = claims.email_verified === true;
  const recorded = await deps.db.$transaction(async tx => {
    if (record.isEmailVerified !== emailVerified) {
      await tx.user.update({
        where: { userId: record.userId },
        data: { isEmailVerified: emailVerified },
      });
    }
    return recordContentEvent(
      tx,
      {
        actorUserId: record.userId,
        action: 'auth_login',
        entityType: 'user',
        entityId: record.userId,
        meta,
      },
      deps.ipKey()
    );
  });
  if (!recorded) {
    deps.log.error('auth.login event skipped: client IP unavailable', {
      requestId: meta.requestId,
    });
  }

  if (record.onboardedAt === null) return ok({ cookie, session: { status: 'needs-onboarding' } });
  const user = toSessionUser({ ...record, isEmailVerified: emailVerified });
  return ok({ cookie, session: { status: 'authenticated', user: toClientUser(user) } });
};
