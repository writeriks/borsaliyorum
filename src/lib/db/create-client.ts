import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';

import { PrismaClient } from '@/generated/prisma/client';

/**
 * Havuz ayarları (ADR-0001 Karar 3 "Sürücü"). Runtime Neon'un **pooled** URL'ine bağlanır;
 * fonksiyon başına küçük bir havuz yeterli. pg'nin `connectionTimeoutMillis` varsayılanı 0
 * (sonsuz bekleme) olduğu için açıkça verilir.
 */
export const DEFAULT_POOL_CONFIG = {
  max: 5,
  connectionTimeoutMillis: 5_000,
  // Fluid compute'ta boşta kalan bağlantılar fonksiyon askıya alınmadan kapansın
  idleTimeoutMillis: 5_000,
} as const satisfies PoolConfig;

export type DbHandle = {
  prisma: PrismaClient;
  pool: Pool;
  /** Prisma'yı ve havuzu kapatır (script/test sonu). */
  close: () => Promise<void>;
};

/**
 * `server-only` içermez: seed, test altyapısı ve CLI script'leri de kullanır. Uygulama kodu
 * bunun yerine `@/lib/db`'deki `getDb()`'yi kullanır.
 */
export const createDbHandle = (
  connectionString: string,
  poolConfig: PoolConfig = DEFAULT_POOL_CONFIG
): DbHandle => {
  const pool = new Pool({ ...poolConfig, connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return {
    prisma,
    pool,
    close: async () => {
      await prisma.$disconnect();
      await pool.end();
    },
  };
};
