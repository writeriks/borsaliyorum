import 'server-only';

import { getDb, type PrismaClient } from '@/lib/db';
import { ErrorCode, fail, ok, toFailure, type Failure, type Result } from '@/lib/errors';
import { logger as defaultLogger, type Logger } from '@/lib/logger';
import { consumeRateLimit } from '@/lib/rate-limit';
import type { SafeFetchOptions } from '@/lib/safe-fetch';

import { linkPreviewQuerySchema } from '../schemas';
import type { LinkPreviewResponse } from '../types';

import { getOrFetchPreview } from './get-or-fetch-preview';

/** Kullanıcı başına dakikada 20 önizleme isteği (ADR-0002 Karar 6). */
export const LINK_PREVIEW_RATE_LIMIT = { limit: 20, windowMs: 60_000 } as const;

/** Oturumdaki kullanıcının kimliği; anonimse null. */
export type SessionUserResolver = () => Promise<{ readonly userId: number } | null>;

/**
 * S5 (oturum) gelene kadar yer tutucu: her isteği anonim sayar, yani uç `UNAUTHENTICATED`
 * döner (fail-closed). S5'te `lib/auth/session`'daki `getCurrentUser` ile değiştirilir.
 */
export const anonymousSessionStub: SessionUserResolver = async () => null;

export type LinkPreviewHandlerDeps = {
  readonly getSessionUser: SessionUserResolver;
  readonly db?: () => PrismaClient;
  readonly logger?: Logger;
  readonly now?: () => Date;
  readonly fetchOptions?: SafeFetchOptions;
};

const STATUS_BY_ERROR: Partial<Record<ErrorCode, number>> = {
  [ErrorCode.UNAUTHENTICATED]: 401,
  [ErrorCode.VALIDATION]: 400,
  [ErrorCode.RATE_LIMITED]: 429,
};

const failureResponse = (failure: Failure): Response => {
  const headers = new Headers({ 'cache-control': 'no-store' });
  const retryAfter = failure.meta?.retryAfter;
  if (typeof retryAfter === 'number') headers.set('retry-after', String(retryAfter));
  return Response.json(failure, { status: STATUS_BY_ERROR[failure.error] ?? 500, headers });
};

const resolvePreview = async (
  request: Request,
  deps: LinkPreviewHandlerDeps
): Promise<Result<LinkPreviewResponse>> => {
  const parsed = linkPreviewQuerySchema.safeParse({
    url: new URL(request.url).searchParams.get('url') ?? undefined,
  });
  if (!parsed.success) return fail(ErrorCode.VALIDATION);

  const user = await deps.getSessionUser();
  if (!user) return fail(ErrorCode.UNAUTHENTICATED);

  const db = (deps.db ?? getDb)();
  const now = deps.now?.() ?? new Date();
  const limit = await consumeRateLimit(
    db,
    { key: `link-preview:u:${user.userId}`, ...LINK_PREVIEW_RATE_LIMIT },
    now
  );
  if (!limit.allowed) return fail(ErrorCode.RATE_LIMITED, { retryAfter: limit.retryAfterSeconds });

  const preview = await getOrFetchPreview(parsed.data.url, {
    db,
    now: () => now,
    ...(deps.logger ? { logger: deps.logger } : {}),
    ...(deps.fetchOptions ? { fetchOptions: deps.fetchOptions } : {}),
  });
  return ok({ preview });
};

/**
 * `GET /api/link-preview?url=`: Zod parse → oturum → rate limit → önbellekli önizleme.
 * Gövde `Result<LinkPreviewResponse>`; önizleme olmaması hata değildir (`preview: null`).
 */
export const handleLinkPreviewRequest = async (
  request: Request,
  deps: LinkPreviewHandlerDeps
): Promise<Response> => {
  let result: Result<LinkPreviewResponse>;
  try {
    result = await resolvePreview(request, deps);
  } catch (error) {
    result = toFailure(error, deps.logger ?? defaultLogger);
  }
  if (!result.ok) return failureResponse(result);
  // Önizleme kullanıcıya özgü değildir ama uç girişlidir; paylaşılan cache'e girmez.
  return Response.json(result, { headers: { 'cache-control': 'private, max-age=300' } });
};
