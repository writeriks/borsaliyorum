import { ErrorCode, fail, ok, type Result } from '@/lib/errors';
import type { Logger } from '@/lib/logger';

import { anonymousErrorCode, type SessionState, type SessionUser } from './types';

/**
 * `requireWriter`'ın ek kapısı (genişleme noktası): e-posta doğrulamasından sonra sırayla çalışır,
 * ilk `Failure` yazmayı durdurur. Kapı listesinin tek kaynağı `writer-gates.ts`;
 * action'lar değişmez.
 */
export type WriterGate = (user: SessionUser) => Promise<Result<null>>;

export type WriterDeps = {
  /** Firebase'deki güncel `emailVerified` (`admin.getUser(uid)`). */
  readonly fetchEmailVerified: (firebaseUid: string) => Promise<boolean>;
  /** DB'deki `isEmailVerified`'ı true yapar. */
  readonly markEmailVerified: (userId: number) => Promise<void>;
  readonly log: Logger;
  /** Ek kapılar (bkz. `WriterGate`); varsayılan yok. */
  readonly gates?: readonly WriterGate[];
};

const runGates = async (
  user: SessionUser,
  gates: readonly WriterGate[]
): Promise<Result<SessionUser>> => {
  for (const gate of gates) {
    const result = await gate(user);
    if (!result.ok) return result;
  }
  return ok(user);
};

/**
 * Yazma yetkisi (gönderi, yorum, beğeni …; ADR-0001 Karar 5, auth-session "Güvenlik"):
 * - anonim → `UNAUTHENTICATED` (askıdaki hesap → `ACCOUNT_SUSPENDED`), onboarding eksik →
 *   `ONBOARDING_REQUIRED` (askıdaki/çıkış yapmış hesap `resolveSession`'da zaten anonimdir)
 * - e-posta doğrulanmamışsa Firebase'den **bir kez** tazelenir (bu durumda tek ağ çağrısı);
 *   doğrulanmışsa DB güncellenir ve devam edilir, değilse `EMAIL_NOT_VERIFIED`.
 *   Firebase'e ulaşılamazsa bilinen durum geçerlidir (fail-closed: `EMAIL_NOT_VERIFIED`).
 * - ardından ek kapılar (`deps.gates`, üretimde `WRITER_GATES`) sırayla; ör. yasal metin paketi
 *   güncel değilse `LEGAL_ACCEPTANCE_REQUIRED`. Kapılar e-posta kontrolünden SONRA çalışır:
 *   "Doğruladım" tazelemesi kabul beklerken de DB'ye yazılır.
 */
export const resolveWriter = async (
  session: SessionState,
  deps: WriterDeps
): Promise<Result<SessionUser>> => {
  if (session.status === 'anonymous') return fail(anonymousErrorCode(session));
  if (session.status === 'needs-onboarding') return fail(ErrorCode.ONBOARDING_REQUIRED);
  const { user, firebaseUid } = session;
  const gates = deps.gates ?? [];
  if (user.emailVerified) return runGates(user, gates);

  let verified: boolean;
  try {
    verified = await deps.fetchEmailVerified(firebaseUid);
  } catch (error) {
    deps.log.warn('email verification refresh failed', { err: error });
    return fail(ErrorCode.EMAIL_NOT_VERIFIED);
  }
  if (!verified) return fail(ErrorCode.EMAIL_NOT_VERIFIED);

  await deps.markEmailVerified(user.userId);
  return runGates({ ...user, emailVerified: true }, gates);
};
