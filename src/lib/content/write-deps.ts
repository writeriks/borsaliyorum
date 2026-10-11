import 'server-only';

import { Prisma, type PrismaClient } from '@/generated/prisma/client';
import type { SessionUser } from '@/lib/auth/types';
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
};

/** Benzersizlik ihlali (`P2002`) mi? Sürücü adaptörüyle `meta` biçimi değiştiği için kod yeterli. */
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
