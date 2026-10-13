import 'server-only';

import { feedQuerySchema, newPostsQuerySchema } from '@/features/feed/schemas';
import type { FeedPage } from '@/features/feed/types';
import { getDb, type PrismaClient } from '@/lib/db';
import { ErrorCode, fail, type Failure, type Result, toFailure } from '@/lib/errors';
import { logger as defaultLogger, type Logger } from '@/lib/logger';
import { createMemoryRateLimiter, type MemoryRateLimiter } from '@/lib/rate-limit/memory';

import { countNewFeedPosts, loadFeedPage } from './feed';

/**
 * `GET /api/feed` ve `GET /api/feed/new` çekirdeği (ADR-0001: istemcinin TanStack Query ile
 * okuduğu ince GET uçları; sorgu ve kapsam `feed.ts` DAL'ında). Zod → oturum → kullanıcı başına
 * bellek içi sayaç (okuma; DB'ye sayaç yazmak sorgudan pahalı) → DAL. Yanıt kişiye özel:
 * paylaşılan önbelleğe girmez.
 */

/** Sonsuz kaydırma + 60 sn'lik yeni gönderi yoklaması için bol; kazara döngüleri keser. */
export const FEED_RATE_LIMIT = { limit: 120, windowMs: 60_000 } as const;

export type SessionAuthorizer = () => Promise<Result<{ readonly userId: number }>>;

export type FeedHandlerDeps = {
  readonly authorize: SessionAuthorizer;
  readonly db?: () => PrismaClient;
  readonly limiter?: MemoryRateLimiter;
  readonly logger?: Logger;
  readonly now?: () => Date;
};

const sharedLimiter = createMemoryRateLimiter(FEED_RATE_LIMIT);

const STATUS_BY_ERROR: Partial<Record<ErrorCode, number>> = {
  [ErrorCode.UNAUTHENTICATED]: 401,
  [ErrorCode.ONBOARDING_REQUIRED]: 403,
  [ErrorCode.VALIDATION]: 400,
  [ErrorCode.RATE_LIMITED]: 429,
};

const NO_STORE = 'private, no-store';

const failureResponse = (failure: Failure): Response => {
  const headers = new Headers({ 'cache-control': NO_STORE });
  const retryAfter = failure.meta?.retryAfter;
  if (typeof retryAfter === 'number') headers.set('retry-after', String(retryAfter));
  return Response.json(failure, { status: STATUS_BY_ERROR[failure.error] ?? 500, headers });
};

const respond = async <T>(
  deps: FeedHandlerDeps,
  run: () => Promise<Result<T>>
): Promise<Response> => {
  let result: Result<T>;
  try {
    result = await run();
  } catch (error) {
    result = toFailure(error, deps.logger ?? defaultLogger);
  }
  if (!result.ok) return failureResponse(result);
  return Response.json(result, { headers: { 'cache-control': NO_STORE } });
};

const gate = async (deps: FeedHandlerDeps): Promise<Result<{ readonly userId: number }>> => {
  const auth = await deps.authorize();
  if (!auth.ok) return auth;
  const now = deps.now?.() ?? new Date();
  const decision = (deps.limiter ?? sharedLimiter).consume(
    `feed:u:${auth.data.userId}`,
    now.getTime()
  );
  return decision.allowed
    ? auth
    : fail(ErrorCode.RATE_LIMITED, { retryAfter: decision.retryAfterSeconds });
};

const paramsOf = (request: Request): Record<string, string> =>
  Object.fromEntries(new URL(request.url).searchParams.entries());

/** `GET /api/feed?tab=latest|popular&cursor=` → `Result<FeedPage>`. */
export const handleFeedRequest = (request: Request, deps: FeedHandlerDeps): Promise<Response> =>
  respond<FeedPage>(deps, async () => {
    const parsed = feedQuerySchema.safeParse(paramsOf(request));
    if (!parsed.success) return fail(ErrorCode.VALIDATION);
    const viewer = await gate(deps);
    if (!viewer.ok) return viewer;
    return loadFeedPage((deps.db ?? getDb)(), viewer.data.userId, {
      tab: parsed.data.tab,
      cursor: parsed.data.cursor,
      ...(deps.now ? { now: deps.now() } : {}),
    });
  });

/** `GET /api/feed/new?since=` → `Result<{ count }>` ("N yeni gönderi" bandı). */
export const handleNewPostsRequest = (request: Request, deps: FeedHandlerDeps): Promise<Response> =>
  respond<{ count: number }>(deps, async () => {
    const parsed = newPostsQuerySchema.safeParse(paramsOf(request));
    if (!parsed.success) return fail(ErrorCode.VALIDATION);
    const viewer = await gate(deps);
    if (!viewer.ok) return viewer;
    return countNewFeedPosts((deps.db ?? getDb)(), viewer.data.userId, parsed.data.since);
  });
