import 'server-only';

import { Prisma, type PrismaClient } from '@/generated/prisma/client';
import { recordContentEvent, type ContentEventInput } from '@/lib/audit/content-event';
import type { SessionUser } from '@/lib/auth/types';
import { AppError, ErrorCode, fail, ok, type Result } from '@/lib/errors';
import type { Logger } from '@/lib/logger';
import type { RequestMeta } from '@/lib/request-meta';

/**
 * Yazma servislerinin bağımlılıkları. Server Action'lar gerçeklerini verir; integration testleri
 * aynı servisleri gerçek DB ile çağırır (yalnızca oturum ve Next API'leri mock'lanır).
 */
export type WriteDeps = {
  readonly db: PrismaClient;
  /** `requireWriter()` sonucu: girişli, onboarding'i bitmiş, e-postası doğrulanmış. */
  readonly user: SessionUser;
  readonly meta: RequestMeta;
  readonly ipKey: () => Uint8Array;
  readonly now: () => Date;
  readonly log: Logger;
  /**
   * İstemci IP'si alınamazsa yazma reddedilsin mi (K-B)? Production runtime'da evet: 5651 erişim
   * izi (ContentEvent, IP zorunlu) yazılamayan içerik yayına girmez. Dev/test'te hayır: olay
   * atlanır ve loglanır (yerel `next dev`'de proxy başlığı olmayabilir).
   */
  readonly requireClientIp: boolean;
};

/**
 * ContentEvent üreten yazmaların ön kapısı (rate limit ve DB işinden önce): production'da IP yoksa
 * `INTERNAL` + error log. Kullanıcıya teknik ayrıntı gitmez; altyapı (proxy başlığı) bozuktur.
 */
export const ensureAuditable = (deps: WriteDeps, action: string): Result<null> => {
  if (deps.meta.ip !== null || !deps.requireClientIp) return ok(null);
  deps.log.error('write rejected: client IP unavailable (5651 audit)', {
    action,
    requestId: deps.meta.requestId,
  });
  return fail(ErrorCode.INTERNAL);
};

/**
 * Transaction içinde ContentEvent yazar. IP yoksa: `requireClientIp` ise işlem geri alınır
 * (`ensureAuditable` önceden yakalar; bu, arada değişmeyecek bir durumun savunmasıdır), değilse
 * olay atlanır ve loglanır.
 */
export const recordWriteEvent = async (
  tx: Pick<Prisma.TransactionClient, 'contentEvent'>,
  input: Omit<ContentEventInput, 'meta'>,
  deps: WriteDeps
): Promise<void> => {
  const recorded = await recordContentEvent(tx, { ...input, meta: deps.meta }, deps.ipKey());
  if (recorded) return;
  deps.log.error(`${input.action} event skipped: client IP unavailable`, {
    requestId: deps.meta.requestId,
  });
  if (deps.requireClientIp) throw new AppError(ErrorCode.INTERNAL);
};

/** Benzersizlik ihlali (`P2002`) mi? Sürücü adaptörüyle `meta` biçimi değiştiği için kod yeterli. */
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
