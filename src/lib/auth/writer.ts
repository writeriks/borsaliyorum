import { ErrorCode, fail, ok, type Result } from '@/lib/errors';
import type { Logger } from '@/lib/logger';

import { anonymousErrorCode, type SessionState, type SessionUser } from './types';

export type WriterDeps = {
  /** Firebase'deki güncel `emailVerified` (`admin.getUser(uid)`). */
  readonly fetchEmailVerified: (firebaseUid: string) => Promise<boolean>;
  /** DB'deki `isEmailVerified`'ı true yapar. */
  readonly markEmailVerified: (userId: number) => Promise<void>;
  readonly log: Logger;
};

/**
 * Yazma yetkisi (gönderi, yorum, beğeni …; ADR-0001 Karar 5, auth-session "Güvenlik"):
 * - anonim → `UNAUTHENTICATED` (askıdaki hesap → `ACCOUNT_SUSPENDED`), onboarding eksik →
 *   `ONBOARDING_REQUIRED` (askıdaki/çıkış yapmış hesap `resolveSession`'da zaten anonimdir)
 * - e-posta doğrulanmamışsa Firebase'den **bir kez** tazelenir (bu durumda tek ağ çağrısı);
 *   doğrulanmışsa DB güncellenir ve devam edilir, değilse `EMAIL_NOT_VERIFIED`.
 *   Firebase'e ulaşılamazsa bilinen durum geçerlidir (fail-closed: `EMAIL_NOT_VERIFIED`).
 */
export const resolveWriter = async (
  session: SessionState,
  deps: WriterDeps
): Promise<Result<SessionUser>> => {
  if (session.status === 'anonymous') return fail(anonymousErrorCode(session));
  if (session.status === 'needs-onboarding') return fail(ErrorCode.ONBOARDING_REQUIRED);
  const { user, firebaseUid } = session;
  if (user.emailVerified) return ok(user);

  let verified: boolean;
  try {
    verified = await deps.fetchEmailVerified(firebaseUid);
  } catch (error) {
    deps.log.warn('email verification refresh failed', { err: error });
    return fail(ErrorCode.EMAIL_NOT_VERIFIED);
  }
  if (!verified) return fail(ErrorCode.EMAIL_NOT_VERIFIED);

  await deps.markEmailVerified(user.userId);
  return ok({ ...user, emailVerified: true });
};
