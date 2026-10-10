import 'server-only';

import { cookies, headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';

import { redirect } from '@/i18n/navigation';
import { getIpEncryptionKey } from '@/lib/crypto/key';
import { getDb } from '@/lib/db';
import { ErrorCode, fail, ok, type Result } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { RequestMeta } from '@/lib/request-meta';

import { clearedSessionCookieOptions, SESSION_COOKIE } from './cookies';
import { createSessionFromIdToken, type CreatedSession } from './create-session';
import { getAdminAuth } from './firebase-admin';
import { resolveSession } from './resolve-session';
import { safeNextPath, truncateToSecond } from './rules';
import {
  ANONYMOUS_SESSION,
  type OnboardingIdentity,
  type SessionState,
  type SessionUser,
} from './types';
import { sessionUserSelect } from './user-record';

const log = logger.child({ module: 'auth.session' });

/** proxy.ts'in her sayfa isteğine yazdığı yol; `requireUser` `?next=` için okur. */
export const PATHNAME_HEADER = 'x-borsaliyorum-path';

/**
 * Oturum durumu: istek başına bir kez çözülür (React `cache`). Sunucu tek doğruluk kaynağıdır;
 * layout bunu `AuthProvider`'a verir, istemci auth durumunu "keşfetmez" (auth-session).
 */
export const getSession = cache(async (): Promise<SessionState> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return ANONYMOUS_SESSION;
  return resolveSession(value, {
    verifySessionCookie: (cookie, checkRevoked) =>
      getAdminAuth().verifySessionCookie(cookie, checkRevoked),
    findUserByFirebaseUid: uid =>
      getDb().user.findUnique({ where: { firebaseUserId: uid }, select: sessionUserSelect }),
    log,
  });
});

/** Girişli ve onboarding'i tamamlamış kullanıcı; değilse null. */
export const getCurrentUser = async (): Promise<SessionUser | null> => {
  const session = await getSession();
  return session.status === 'authenticated' ? session.user : null;
};

const currentPath = async (): Promise<string | null> =>
  safeNextPath((await headers()).get(PATHNAME_HEADER));

const redirectTo = async (
  pathname: '/giris' | '/hos-geldin' | '/akis',
  next: string | null
): Promise<never> => {
  const locale = await getLocale();
  return redirect({ href: next ? { pathname, query: { next } } : pathname, locale });
};

/**
 * Sayfa/layout guard'ı: anonim → `/giris?next=…`, onboarding eksik → `/hos-geldin?next=…`.
 * Server Action'larda kullanma (yönlendirme yerine `requireActionUser` ile hata kodu dön).
 */
export const requireUser = async (): Promise<SessionUser> => {
  const session = await getSession();
  if (session.status === 'authenticated') return session.user;
  const next = await currentPath();
  return redirectTo(session.status === 'needs-onboarding' ? '/hos-geldin' : '/giris', next);
};

/** Onboarding sayfası guard'ı: onboarding'i bitmiş kullanıcı akışa, anonim girişe gider. */
export const requireOnboardingIdentity = async (
  next: string | null
): Promise<OnboardingIdentity> => {
  const session = await getSession();
  if (session.status === 'needs-onboarding') return session.identity;
  if (session.status === 'authenticated') return redirectTo('/akis', null);
  return redirectTo('/giris', next);
};

/**
 * Giriş/kayıt sayfası guard'ı: zaten girişliyse `next`'e (yoksa akışa), onboarding eksikse
 * onboarding'e. Geçersiz çerezli kullanıcı burada anonimdir → döngü oluşmaz.
 */
export const redirectIfSignedIn = async (next: string | null): Promise<void> => {
  const session = await getSession();
  if (session.status === 'anonymous') return;
  const locale = await getLocale();
  if (session.status === 'needs-onboarding') {
    redirect({ href: next ? { pathname: '/hos-geldin', query: { next } } : '/hos-geldin', locale });
  }
  redirect({ href: next ?? '/akis', locale });
};

/** Server Action'lar için: yönlendirmez, `UNAUTHENTICATED` / `ONBOARDING_REQUIRED` döner. */
export const requireActionUser = async (): Promise<Result<SessionUser>> => {
  const session = await getSession();
  if (session.status === 'authenticated') return ok(session.user);
  return fail(
    session.status === 'needs-onboarding'
      ? ErrorCode.ONBOARDING_REQUIRED
      : ErrorCode.UNAUTHENTICATED
  );
};

/** Onboarding Server Action'ı için kimlik (kullanıcı satırı henüz olmayabilir). */
export const requireActionOnboardingIdentity = async (): Promise<Result<OnboardingIdentity>> => {
  const session = await getSession();
  if (session.status === 'needs-onboarding') return ok(session.identity);
  return fail(session.status === 'authenticated' ? ErrorCode.CONFLICT : ErrorCode.UNAUTHENTICATED);
};

/**
 * Yazma yetkisi (gönderi/yorum): e-postası doğrulanmamış kullanıcı okuyabilir, yazamaz
 * (spam ve 5651 sorumluluğu). Askıdaki hesap zaten oturum açamaz (`resolveSession`).
 */
export const canWrite = (user: SessionUser): Result<SessionUser> =>
  user.emailVerified ? ok(user) : fail(ErrorCode.EMAIL_NOT_VERIFIED);

/** POST /api/auth/session: ID token'dan oturum. */
export const createSession = async (
  idToken: string,
  meta: RequestMeta
): Promise<Result<CreatedSession>> => {
  const auth = getAdminAuth();
  return createSessionFromIdToken(idToken, meta, {
    verifyIdToken: (token, checkRevoked) => auth.verifyIdToken(token, checkRevoked),
    createSessionCookie: (token, expiresIn) => auth.createSessionCookie(token, { expiresIn }),
    db: getDb(),
    ipKey: getIpEncryptionKey,
    now: () => new Date(),
    log,
  });
};

/**
 * Çıkış = tüm cihazlardan çıkış (K8): `sessionsValidAfter` ileri alınır (her istekte kontrol
 * edilir, anında etkili), Firebase refresh token'ları iptal edilir ve çerez silinir. Oturum zaten
 * geçersizse yalnızca çerez silinir. Firebase çağrısı başarısız olsa da DB işareti yeterlidir.
 */
export const destroySession = async (): Promise<void> => {
  const session = await getSession();
  const store = await cookies();

  if (session.status !== 'anonymous') {
    const firebaseUid =
      session.status === 'authenticated' ? session.firebaseUid : session.identity.firebaseUid;
    await getDb().user.updateMany({
      where: { firebaseUserId: firebaseUid },
      data: { sessionsValidAfter: truncateToSecond(new Date()) },
    });
    try {
      await getAdminAuth().revokeRefreshTokens(firebaseUid);
    } catch (error) {
      log.error('revokeRefreshTokens failed', { err: error });
    }
  }

  store.set(SESSION_COOKIE, '', clearedSessionCookieOptions());
};
