import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';

import { ErrorCode, fail, ok, toFailure, type Result } from '@/lib/errors';
import { logger as defaultLogger, type Logger } from '@/lib/logger';

export type RevalidateStocksDeps = {
  /** `STOCKS_REVALIDATE_SECRET`; tanımsızsa uç kapalıdır (404). */
  readonly secret: string | undefined;
  readonly invalidate: () => Promise<void>;
  readonly logger?: Logger;
};

const digest = (value: string): Buffer => createHash('sha256').update(value, 'utf8').digest();

/** Sabit zamanlı karşılaştırma; uzunluk farkı da sızmasın diye önce özet alınır. */
const matches = (given: string, expected: string): boolean =>
  timingSafeEqual(digest(given), digest(expected));

const readBearer = (request: Request): string | null => {
  const header = request.headers.get('authorization');
  const match = header ? /^Bearer (\S+)$/.exec(header) : null;
  return match?.[1] ?? null;
};

/**
 * `POST /api/revalidate/stocks`: stock sync workflow'unun son adımı (paylaşılan secret ile).
 * Kullanıcı oturumu yok; yalnızca `Authorization: Bearer <secret>`.
 */
export const handleRevalidateStocksRequest = async (
  request: Request,
  deps: RevalidateStocksDeps
): Promise<Response> => {
  const log = deps.logger ?? defaultLogger;
  const headers = { 'cache-control': 'no-store' };
  if (!deps.secret) {
    return Response.json(fail(ErrorCode.NOT_FOUND), { status: 404, headers });
  }
  const token = readBearer(request);
  if (token === null || !matches(token, deps.secret)) {
    return Response.json(fail(ErrorCode.UNAUTHENTICATED), { status: 401, headers });
  }
  let result: Result<{ revalidated: true }>;
  try {
    await deps.invalidate();
    log.info('stock index revalidated');
    result = ok({ revalidated: true });
  } catch (error) {
    result = toFailure(error, log);
  }
  return Response.json(result, { status: result.ok ? 200 : 500, headers });
};
