import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/cookies';
import { isSameOriginRequest, verifyCsrfToken } from '@/lib/auth/csrf';
import { consumeAuthRateLimit } from '@/lib/auth/rate-limit';
import { createSession, destroySession } from '@/lib/auth/session';
import { ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { readRequestMeta } from '@/lib/request-meta';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'api.auth.session' });

const bodySchema = z.object({ idToken: z.string().min(1).max(8192) });

const STATUS_BY_CODE: Partial<Record<ErrorCode, number>> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  REAUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  ACCOUNT_SUSPENDED: 403,
  RATE_LIMITED: 429,
};

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

const errorResponse = (error: ErrorCode, retryAfter?: number): NextResponse =>
  NextResponse.json(
    { ok: false, error },
    {
      status: STATUS_BY_CODE[error] ?? 500,
      headers: retryAfter ? { ...NO_STORE, 'Retry-After': String(retryAfter) } : NO_STORE,
    }
  );

/** Origin + double-submit CSRF (auth-session "Güvenlik"); geçmezse 403. */
const rejectCrossSite = (request: NextRequest): NextResponse | null => {
  if (!isSameOriginRequest(request.headers)) return errorResponse(ErrorCode.FORBIDDEN);
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  if (!verifyCsrfToken(cookieToken, request.headers.get(CSRF_HEADER))) {
    return errorResponse(ErrorCode.FORBIDDEN);
  }
  return null;
};

/** Giriş/kayıt: Firebase ID token → 14 günlük `__session` çerezi. */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;

  const meta = readRequestMeta(request.headers);
  // IP başına (hash'li, ≤24 saat); hesap başına sınır token doğrulandıktan sonra createSession'da
  const limit = await consumeAuthRateLimit('session.ip', meta.ip);
  if (!limit.ok) return errorResponse(ErrorCode.RATE_LIMITED, limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(ErrorCode.VALIDATION);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return errorResponse(ErrorCode.VALIDATION);

  try {
    const result = await createSession(parsed.data.idToken, meta);
    if (!result.ok) {
      const retryAfter = result.meta?.retryAfter;
      return errorResponse(result.error, typeof retryAfter === 'number' ? retryAfter : undefined);
    }
    const response = NextResponse.json(
      { ok: true, session: result.data.session },
      { headers: NO_STORE }
    );
    response.cookies.set(SESSION_COOKIE, result.data.cookie, sessionCookieOptions());
    return response;
  } catch (error) {
    log.error('session create failed', { err: error, requestId: meta.requestId });
    return errorResponse(ErrorCode.INTERNAL);
  }
};

/** Çıkış (tüm cihazlar, K8). Çerez her durumda silinir. */
export const DELETE = async (request: NextRequest): Promise<NextResponse> => {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;
  try {
    await destroySession();
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    log.error('session destroy failed', { err: error });
    return errorResponse(ErrorCode.INTERNAL);
  }
};
