'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
import { getAdminAuth } from '@/lib/auth/firebase-admin';
import { authRateLimiter } from '@/lib/auth/rate-limit';
import { safeNextPath } from '@/lib/auth/rules';
import { getSession, requireActionOnboardingIdentity } from '@/lib/auth/session';
import { getIpEncryptionKey } from '@/lib/crypto/key';
import { getDb } from '@/lib/db';
import { ErrorCode, fail, ok, type Result, toFailure } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { readRequestMeta } from '@/lib/request-meta';
import { normalizeUsernameInput, usernameIssue } from '@/lib/users/username';

import { onboardingSchema, usernameCheckSchema } from '../schemas';

import {
  checkUsername,
  completeOnboardingForIdentity,
  type UsernameAvailability,
} from './onboarding';

const log = logger.child({ module: 'auth.actions' });

/**
 * Onboarding (Zod → kimlik → rate limit → işlem → revalidate). Başarıda `next`'e ya da akışa
 * sunucuda yönlendirir; root layout yeni oturumla yeniden render edilir.
 */
export const completeOnboarding = async (input: unknown): Promise<Result<never>> => {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const usernameIssueCode = parsed.error.issues.find(issue => issue.path[0] === 'username');
    if (usernameIssueCode?.message === 'reserved') return fail(ErrorCode.USERNAME_RESERVED);
    return fail(ErrorCode.VALIDATION, {
      fields: [...new Set(parsed.error.issues.map(issue => String(issue.path[0])))],
    });
  }

  const identity = await requireActionOnboardingIdentity();
  if (!identity.ok) return identity;

  const limit = await authRateLimiter(`auth.onboarding:uid:${identity.data.firebaseUid}`);
  if (!limit.ok) return fail(ErrorCode.RATE_LIMITED, { retryAfter: limit.retryAfterSeconds });

  let result: Awaited<ReturnType<typeof completeOnboardingForIdentity>>;
  try {
    result = await completeOnboardingForIdentity(
      identity.data,
      parsed.data,
      readRequestMeta(await headers()),
      { db: getDb(), ipKey: getIpEncryptionKey, now: () => new Date(), log }
    );
  } catch (error) {
    return toFailure(error, log);
  }
  if (!result.ok) return result;

  revalidatePath('/', 'layout');
  const next = safeNextPath(parsed.data.next);
  const locale = await getLocale();
  return redirect({ href: next ?? '/akis', locale });
};

/** Onboarding formundaki canlı müsaitlik kontrolü. */
export const checkUsernameAvailability = async (
  input: unknown
): Promise<Result<{ availability: UsernameAvailability }>> => {
  const parsed = usernameCheckSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const identity = await requireActionOnboardingIdentity();
  if (!identity.ok) return identity;

  const username = normalizeUsernameInput(parsed.data.username);
  const issue = usernameIssue(username);
  if (issue === 'reserved') return ok({ availability: 'reserved' });
  if (issue) return ok({ availability: 'invalid' });
  try {
    const availability = await checkUsername(getDb(), username, identity.data.existingUserId);
    return ok({ availability });
  } catch (error) {
    return toFailure(error, log);
  }
};

/**
 * "Doğruladım": Firebase'den güncel `emailVerified` okunur ve DB'ye yazılır. Her istekte
 * Firebase'e sorulmaz; yalnızca kullanıcı isteyince (ve her girişte token'dan).
 */
export const refreshEmailVerification = async (): Promise<Result<{ verified: boolean }>> => {
  const session = await getSession();
  if (session.status !== 'authenticated') return fail(ErrorCode.UNAUTHENTICATED);
  if (session.user.emailVerified) return ok({ verified: true });
  try {
    const record = await getAdminAuth().getUser(session.firebaseUid);
    if (record.emailVerified) {
      await getDb().user.update({
        where: { userId: session.user.userId },
        data: { isEmailVerified: true },
      });
      revalidatePath('/', 'layout');
    }
    return ok({ verified: record.emailVerified });
  } catch (error) {
    return toFailure(error, log);
  }
};

/**
 * Doğrulama e-postasını yeniden göndermek için kısa ömürlü Firebase özel token'ı. İstemci bununla
 * anlık oturum açıp `sendEmailVerification` çağırır (istemcide kalıcı oturum yok).
 */
export const createVerificationToken = async (): Promise<Result<{ token: string }>> => {
  const session = await getSession();
  if (session.status !== 'authenticated') return fail(ErrorCode.UNAUTHENTICATED);
  if (session.user.emailVerified) return fail(ErrorCode.CONFLICT);
  const limit = await authRateLimiter(`auth.verify-email:u:${session.user.userId}`);
  if (!limit.ok) return fail(ErrorCode.RATE_LIMITED, { retryAfter: limit.retryAfterSeconds });
  try {
    return ok({ token: await getAdminAuth().createCustomToken(session.firebaseUid) });
  } catch (error) {
    return toFailure(error, log);
  }
};
