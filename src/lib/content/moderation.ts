import 'server-only';

import type { Prisma, PrismaClient } from '@/generated/prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/** İçerik kaldırabilen roller (K-A). */
const MODERATION_ROLES = ['moderator', 'admin'] as const;

/**
 * Kullanıcı içerik kaldırabilir mi? Rol **DB'den** (`SecurityRole`) okunur; oturumdaki rol listesi
 * yalnızca UI içindir (auth-session "Rol kontrolü sunucuda, DB'den"). Rol geri alındığında oturum
 * yenilenmeden de etkisini yitirir.
 */
export const canModerate = async (db: Db, userId: number): Promise<boolean> =>
  (await db.securityRole.count({
    where: { userId, role: { in: [...MODERATION_ROLES] } },
  })) > 0;
