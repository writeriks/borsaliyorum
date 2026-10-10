'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { consumeAuthRateLimit, type RateLimitDecision } from '@/lib/auth/rate-limit';
import { redirectToNext } from '@/lib/auth/redirect-next';
import { getSession, requireActionOnboardingIdentity, requireWriter } from '@/lib/auth/session';
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

const rateLimited = (limit: Extract<RateLimitDecision, { ok: false }>) =>
  fail(ErrorCode.RATE_LIMITED, { retryAfter: limit.retryAfterSeconds });

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

  const limit = await consumeAuthRateLimit('onboarding.uid', identity.data.firebaseUid);
  if (!limit.ok) return rateLimited(limit);

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
  // `next` ham yol (`/en/akis`): next-intl redirect'i öneki ikinci kez eklerdi
  return redirectToNext(parsed.data.next);
};

/** Onboarding formundaki canlı müsaitlik kontrolü. */
export const checkUsernameAvailability = async (
  input: unknown
): Promise<Result<{ availability: UsernameAvailability }>> => {
  const parsed = usernameCheckSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const identity = await requireActionOnboardingIdentity();
  if (!identity.ok) return identity;

  // Kullanıcı adı numaralandırmasına karşı hem hesap hem IP (hash'li) başına
  const byUid = await consumeAuthRateLimit('username-check.uid', identity.data.firebaseUid);
  if (!byUid.ok) return rateLimited(byUid);
  const byIp = await consumeAuthRateLimit('username-check.ip', readRequestMeta(await headers()).ip);
  if (!byIp.ok) return rateLimited(byIp);

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
 * "Doğruladım": Firebase'den güncel `emailVerified` okunur ve DB'ye yazılır (`requireWriter`
 * ile aynı tazeleme). Her istekte Firebase'e sorulmaz; yalnızca kullanıcı isteyince, yazma
 * denediğinde ve her girişte token'dan.
 */
export const refreshEmailVerification = async (): Promise<Result<{ verified: boolean }>> => {
  const before = await getSession();
  if (before.status !== 'authenticated') return fail(ErrorCode.UNAUTHENTICATED);
  if (before.user.emailVerified) return ok({ verified: true });
  const writer = await requireWriter();
  if (writer.ok) {
    revalidatePath('/', 'layout');
    return ok({ verified: true });
  }
  return writer.error === ErrorCode.EMAIL_NOT_VERIFIED ? ok({ verified: false }) : writer;
};

/**
 * Doğrulama e-postasını yeniden gönderme izni (hesap başına rate limit). E-postayı sunucu
 * göndermez: mail altyapısı gelene kadar Firebase istemci SDK'sının `sendEmailVerification`'ı
 * kullanılır (bkz. `features/auth/client/auth-flows.ts`). İstemciye **hiçbir zaman** özel
 * (custom) token verilmez; istemci oturumu yoksa kullanıcı yeniden giriş yapar.
 *
 * TAKİP: mail altyapısı gelince sunucuda `admin.generateEmailVerificationLink` + kendi mail
 * gönderimimiz; bu action o zaman e-postayı kendisi gönderir.
 */
export const authorizeVerificationEmail = async (): Promise<Result<null>> => {
  const session = await getSession();
  if (session.status !== 'authenticated') return fail(ErrorCode.UNAUTHENTICATED);
  if (session.user.emailVerified) return fail(ErrorCode.CONFLICT);
  const limit = await consumeAuthRateLimit('verify-email.uid', session.firebaseUid);
  if (!limit.ok) return rateLimited(limit);
  return ok(null);
};
