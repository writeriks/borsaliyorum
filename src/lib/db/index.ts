import 'server-only';

import { attachDatabasePool } from '@vercel/functions';

import type { PrismaClient } from '@/generated/prisma/client';
import { serverEnvSchema } from '@/lib/env';

import { createDbHandle, type DbHandle } from './create-client';

export type { Prisma, PrismaClient } from '@/generated/prisma/client';
export { decodeCursor, encodeCursor, type Cursor } from './cursor';
export { decodeScoreCursor, encodeScoreCursor, type ScoreCursor } from './score-cursor';

// Geliştirmede HMR modülü yeniden yükler; her seferinde yeni havuz açılmasın
const globalForDb = globalThis as typeof globalThis & { __borsaliyorumDb?: DbHandle };

/**
 * İstek yolunda kullanılan tek Prisma istemcisi. İlk çağrıda kurulur (import anında değil),
 * böylece env'siz `next build` modülü yükleyebilir.
 *
 * Yalnızca `DATABASE_URL` doğrulanır: integration testleri Firebase env'i olmadan çalışır.
 */
export const getDb = (): PrismaClient => {
  if (!globalForDb.__borsaliyorumDb) {
    const url = serverEnvSchema.shape.DATABASE_URL.parse(process.env.DATABASE_URL);
    const handle = createDbHandle(url);
    // Vercel Fluid compute: fonksiyon askıya alınmadan önce boşta bağlantıları kapatır.
    // Vercel dışında (yerel, test) etkisizdir.
    attachDatabasePool(handle.pool);
    globalForDb.__borsaliyorumDb = handle;
  }
  return globalForDb.__borsaliyorumDb.prisma;
};

/** Testlerde worker DB'si değiştiğinde ya da süreç sonunda havuzu kapatmak için. */
export const disconnectDb = async (): Promise<void> => {
  const handle = globalForDb.__borsaliyorumDb;
  globalForDb.__borsaliyorumDb = undefined;
  await handle?.close();
};
