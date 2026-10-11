import 'server-only';

import { createHmac, randomBytes } from 'node:crypto';

import type { StockIndexItem, TagSuggestion } from '@/features/composer/types';
import { getDb } from '@/lib/db';
import { ErrorCode, fail, ok, toFailure, type Failure, type Result } from '@/lib/errors';
import { logger as defaultLogger, type Logger } from '@/lib/logger';
import { createMemoryRateLimiter, type MemoryRateLimiter } from '@/lib/rate-limit/memory';
import { readRequestMeta } from '@/lib/request-meta';

import { readQueryParam, tagQuerySchema, userQuerySchema } from '../schemas';

import {
  queryDefaultStocks,
  queryMostMentionedTickers,
  queryStockIndex,
  queryTrendingTags,
  suggestTags,
  suggestUsers,
  type AutocompleteDb,
  type Viewer,
} from './queries';

/**
 * `GET /api/autocomplete/*` uçlarının çekirdeği (route dosyaları yalnızca bağımlılık verir).
 * Sıra: oturum → rate limit → Zod parse → DAL. Anonim kullanıcı sorgu geçerliliğini bile
 * öğrenmez (401). Başarılı gövde composer'ın istemci şemalarıyla aynıdır (`composer/schemas.ts`);
 * hata gövdesi `{ ok: false, error }` (`Failure`).
 *
 * Rate limit bellek içidir (instance başına best-effort, ADR-0002 Karar 4): her tuşta DB'ye
 * sayaç yazmak sorgunun kendisinden pahalı. Anahtarda ham IP tutulmaz (süreç başına rastgele
 * anahtarlı HMAC); kullanıcı kimliği iç kimliktir (firebaseUid değil).
 */

/** Girişli kullanıcı başına dakikada 60 istek (users + tags + default ortak). */
export const AUTOCOMPLETE_USER_RATE_LIMIT = { limit: 60, windowMs: 60_000 } as const;
/** Hisse indeksi IP başına; CDN önbelleğinden dönen istekler fonksiyona ulaşmaz. */
export const AUTOCOMPLETE_IP_RATE_LIMIT = { limit: 30, windowMs: 60_000 } as const;

export const CACHE_CONTROL = {
  /** CDN'de 24 saat, tarayıcıda 1 saat (istemci `staleTime` ile aynı). Invalidation: `stocks` tag'i. */
  stockIndex: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600',
  /** Kullanıcıya özgü (takip edilenler) → paylaşılan önbelleğe girmez. */
  defaultStocks: 'private, max-age=300',
  /** Girişli uç: paylaşılan önbelleğe girmez; istemci 30 sn taze sayar. */
  suggestions: 'private, max-age=30',
  failure: 'no-store',
} as const;

export type SessionAuthorizer = () => Promise<Result<Viewer>>;

export type AutocompleteHandlerDeps = {
  readonly authorize: SessionAuthorizer;
  readonly db?: () => AutocompleteDb;
  readonly logger?: Logger;
  readonly now?: () => Date;
  readonly userLimiter?: MemoryRateLimiter;
  readonly ipLimiter?: MemoryRateLimiter;
  /** Önbellekli yükleyiciler (route'ta `unstable_cache`); testte doğrudan DAL. */
  readonly loadStockIndex?: () => Promise<StockIndexItem[]>;
  readonly loadMostMentioned?: () => Promise<string[]>;
  readonly loadTrendingTags?: () => Promise<TagSuggestion[]>;
};

export type PublicHandlerDeps = Omit<AutocompleteHandlerDeps, 'authorize'>;

// Süreç ömrü boyunca tek sayaç (modül tekil); testler kendi sayacını verir
const sharedUserLimiter = createMemoryRateLimiter(AUTOCOMPLETE_USER_RATE_LIMIT);
const sharedIpLimiter = createMemoryRateLimiter(AUTOCOMPLETE_IP_RATE_LIMIT);
const IP_KEY = randomBytes(32);

const ipSubject = (request: Request): string => {
  const ip = readRequestMeta(request.headers).ip;
  // IP yoksa (yerel, başlıksız) ortak kova: limit yine uygulanır (fail-closed)
  if (ip === null) return 'unknown';
  return createHmac('sha256', IP_KEY).update(ip).digest().subarray(0, 16).toString('base64url');
};

const STATUS_BY_ERROR: Partial<Record<ErrorCode, number>> = {
  [ErrorCode.UNAUTHENTICATED]: 401,
  [ErrorCode.ONBOARDING_REQUIRED]: 403,
  [ErrorCode.VALIDATION]: 400,
  [ErrorCode.RATE_LIMITED]: 429,
};

const failureResponse = (failure: Failure): Response => {
  const headers = new Headers({ 'cache-control': CACHE_CONTROL.failure });
  const retryAfter = failure.meta?.retryAfter;
  if (typeof retryAfter === 'number') headers.set('retry-after', String(retryAfter));
  return Response.json(failure, { status: STATUS_BY_ERROR[failure.error] ?? 500, headers });
};

const respond = async <T>(
  deps: { readonly logger?: Logger },
  cacheControl: string,
  run: () => Promise<Result<T>>
): Promise<Response> => {
  let result: Result<T>;
  try {
    result = await run();
  } catch (error) {
    result = toFailure(error, deps.logger ?? defaultLogger);
  }
  if (!result.ok) return failureResponse(result);
  return Response.json(result.data, { headers: { 'cache-control': cacheControl } });
};

const consume = (limiter: MemoryRateLimiter, key: string, now: Date): Failure | null => {
  const decision = limiter.consume(key, now.getTime());
  return decision.allowed
    ? null
    : fail(ErrorCode.RATE_LIMITED, { retryAfter: decision.retryAfterSeconds });
};

/** Oturum + kullanıcı başına sayaç; ikisi de geçerse görüntüleyen. */
const gate = async (deps: AutocompleteHandlerDeps): Promise<Result<Viewer>> => {
  const auth = await deps.authorize();
  if (!auth.ok) return auth;
  const limited = consume(
    deps.userLimiter ?? sharedUserLimiter,
    `ac:u:${auth.data.userId}`,
    deps.now?.() ?? new Date()
  );
  return limited ?? ok({ userId: auth.data.userId });
};

const dbOf = (deps: PublicHandlerDeps): AutocompleteDb => (deps.db ?? getDb)();

/** `GET /api/autocomplete/stocks`: tüm hisse indeksi, herkese açık, CDN önbellekli. */
export const handleStockIndexRequest = (
  request: Request,
  deps: PublicHandlerDeps = {}
): Promise<Response> =>
  respond(deps, CACHE_CONTROL.stockIndex, async () => {
    const now = deps.now?.() ?? new Date();
    const limited = consume(deps.ipLimiter ?? sharedIpLimiter, `ac:ip:${ipSubject(request)}`, now);
    if (limited) return limited;
    const load = deps.loadStockIndex ?? (() => queryStockIndex(dbOf(deps), now));
    return ok(await load());
  });

/** `GET /api/autocomplete/stocks/default`: takip edilenler ya da en çok anılanlar (girişli). */
export const handleDefaultStocksRequest = (deps: AutocompleteHandlerDeps): Promise<Response> =>
  respond(deps, CACHE_CONTROL.defaultStocks, async () => {
    const viewer = await gate(deps);
    if (!viewer.ok) return viewer;
    const db = dbOf(deps);
    const loadMostMentioned =
      deps.loadMostMentioned ?? (() => queryMostMentionedTickers(db, deps.now?.() ?? new Date()));
    return ok(await queryDefaultStocks(db, viewer.data, loadMostMentioned));
  });

/** `GET /api/autocomplete/users?q=` (girişli). */
export const handleUserSuggestionsRequest = (
  request: Request,
  deps: AutocompleteHandlerDeps
): Promise<Response> =>
  respond(deps, CACHE_CONTROL.suggestions, async () => {
    const viewer = await gate(deps);
    if (!viewer.ok) return viewer;
    const parsed = userQuerySchema.safeParse(readQueryParam(new URL(request.url)));
    if (!parsed.success) return fail(ErrorCode.VALIDATION);
    return ok(await suggestUsers(dbOf(deps), viewer.data, parsed.data.q));
  });

/** `GET /api/autocomplete/tags?q=` (girişli). Boş sorgu: son 24 saatin en çok kullanılanları. */
export const handleTagSuggestionsRequest = (
  request: Request,
  deps: AutocompleteHandlerDeps
): Promise<Response> =>
  respond(deps, CACHE_CONTROL.suggestions, async () => {
    const viewer = await gate(deps);
    if (!viewer.ok) return viewer;
    const parsed = tagQuerySchema.safeParse(readQueryParam(new URL(request.url)));
    if (!parsed.success) return fail(ErrorCode.VALIDATION);
    const now = deps.now?.() ?? new Date();
    const db = dbOf(deps);
    if (parsed.data.q === '') {
      const load = deps.loadTrendingTags ?? (() => queryTrendingTags(db, now));
      return ok(await load());
    }
    return ok(await suggestTags(db, parsed.data.q, now));
  });
