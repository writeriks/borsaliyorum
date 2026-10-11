import 'server-only';

import { createHmac, randomBytes } from 'node:crypto';

import { z } from 'zod';

import { postIdParamSchema } from '@/features/posts/schemas';
import { ErrorCode, fail, toFailure, type Failure, type Result } from '@/lib/errors';
import { logger as defaultLogger, type Logger } from '@/lib/logger';
import { createMemoryRateLimiter, type MemoryRateLimiter } from '@/lib/rate-limit/memory';
import { readRequestMeta } from '@/lib/request-meta';

import type { CommentsPage } from '../types';

import { getCommentsPage } from './queries';

/**
 * `GET /api/posts/[id]/comments?cursor=` (S12, public): "Daha fazla yükle" sayfaları. İlk sayfa
 * detay sayfasında sunucuda render edilir; bu uç yalnızca sonrakileri verir. Yanıt görüntüleyene
 * göre değişir (beğeni, engel, silme yetkisi) → HTTP önbelleğine girmez.
 *
 * IP başına bellek içi sınır (autocomplete ile aynı yaklaşım: okuma ucu, DB'ye sayaç yazmak
 * sorgudan pahalı; asıl taban koruma Vercel Firewall). Anahtarda ham IP yok (HMAC).
 */
export const COMMENTS_IP_RATE_LIMIT = { limit: 60, windowMs: 60_000 } as const;

const sharedLimiter = createMemoryRateLimiter(COMMENTS_IP_RATE_LIMIT);
const IP_KEY = randomBytes(32);

/** Opak imleç; biçim `decodeCursor`'da doğrulanır, burada yalnızca boyut sınırı. */
const cursorSchema = z.string().min(1).max(128).nullable();

const STATUS_BY_ERROR: Partial<Record<ErrorCode, number>> = {
  [ErrorCode.VALIDATION]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.RATE_LIMITED]: 429,
};

const PRIVATE_NO_STORE = 'private, no-store';

export type CommentsHandlerDeps = {
  readonly load?: (postId: number, cursor: string | null) => Promise<Result<CommentsPage>>;
  readonly limiter?: MemoryRateLimiter;
  readonly logger?: Logger;
  readonly now?: () => Date;
};

const ipSubject = (request: Request): string => {
  const ip = readRequestMeta(request.headers).ip;
  // IP yoksa (yerel, başlıksız) ortak kova: sınır yine uygulanır (fail-closed)
  if (ip === null) return 'unknown';
  return createHmac('sha256', IP_KEY).update(ip).digest().subarray(0, 16).toString('base64url');
};

const failureResponse = (failure: Failure): Response => {
  const headers = new Headers({ 'cache-control': 'no-store' });
  const retryAfter = failure.meta?.retryAfter;
  if (typeof retryAfter === 'number') headers.set('retry-after', String(retryAfter));
  return Response.json(failure, { status: STATUS_BY_ERROR[failure.error] ?? 500, headers });
};

const run = async (
  request: Request,
  rawPostId: string,
  deps: CommentsHandlerDeps
): Promise<Result<CommentsPage>> => {
  const limiter = deps.limiter ?? sharedLimiter;
  const decision = limiter.consume(
    `comments:ip:${ipSubject(request)}`,
    (deps.now?.() ?? new Date()).getTime()
  );
  if (!decision.allowed) {
    return fail(ErrorCode.RATE_LIMITED, { retryAfter: decision.retryAfterSeconds });
  }
  const postId = postIdParamSchema.safeParse(rawPostId);
  const cursor = cursorSchema.safeParse(new URL(request.url).searchParams.get('cursor'));
  if (!postId.success || !cursor.success) return fail(ErrorCode.VALIDATION);
  return (deps.load ?? getCommentsPage)(postId.data, cursor.data);
};

export const handleCommentsRequest = async (
  request: Request,
  rawPostId: string,
  deps: CommentsHandlerDeps = {}
): Promise<Response> => {
  let result: Result<CommentsPage>;
  try {
    result = await run(request, rawPostId, deps);
  } catch (error) {
    result = toFailure(error, deps.logger ?? defaultLogger);
  }
  if (!result.ok) return failureResponse(result);
  return Response.json(result, { headers: { 'cache-control': PRIVATE_NO_STORE } });
};
