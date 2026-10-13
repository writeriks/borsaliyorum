'use server';

import { revalidatePath } from 'next/cache';

import { consumeAuthRateLimit } from '@/lib/auth/rate-limit';
import { redirectToNext } from '@/lib/auth/redirect-next';
import { requireActionUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { ErrorCode, fail, type Result, toFailure } from '@/lib/errors';
import { logger } from '@/lib/logger';

import { legalAcceptanceSchema } from '../schemas';

import { acceptLegalBundle } from './acceptance';

const log = logger.child({ module: 'legal.actions' });

/**
 * Yasal metin paketinin yeni sürümünü kabul (Zod → oturum → rate limit → işlem → revalidate).
 * `requireWriter` DEĞİL `requireActionUser`: kabul bekleyen kullanıcı tam da yazamadığı için
 * buradadır; e-postası doğrulanmamış kullanıcı da kabul edebilir. Başarıda `next`'e (yoksa
 * akışa) sunucu yönlendirmesi.
 */
export const acceptLegalUpdate = async (input: unknown): Promise<Result<never>> => {
  const parsed = legalAcceptanceSchema.safeParse(input);
  if (!parsed.success) {
    return fail(ErrorCode.VALIDATION, {
      fields: [...new Set(parsed.error.issues.map(issue => String(issue.path[0])))],
    });
  }

  const user = await requireActionUser();
  if (!user.ok) return user;

  const limit = await consumeAuthRateLimit('legal-accept.uid', String(user.data.userId));
  if (!limit.ok) return fail(ErrorCode.RATE_LIMITED, { retryAfter: limit.retryAfterSeconds });

  try {
    await acceptLegalBundle(getDb(), user.data.userId, new Date());
  } catch (error) {
    return toFailure(error, log);
  }

  revalidatePath('/', 'layout');
  return redirectToNext(parsed.data.next);
};
