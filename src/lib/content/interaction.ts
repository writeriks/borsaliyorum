import 'server-only';

import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { ErrorCode, fail, ok, type Result } from '@/lib/errors';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Başkasının içeriğiyle etkileşim (yorum, beğeni) kapısı (K-C): içerik sahiplerinden biriyle iki
 * yönlü engel varsa (sen onu ya da o seni engellemiş) ya da sahibin hesabı etkin değilse
 * (`status != active`: askıda/silinmiş) `FORBIDDEN`. Kendi içeriği her zaman serbest. Tek sorguda
 * hem engel hem durum okunur. Hangi nedenin geçerli olduğu söylenmez (engel bilgisi sızmasın).
 */
export const checkCanInteract = async (
  db: Db,
  actorId: number,
  ownerIds: readonly number[]
): Promise<Result<null>> => {
  const others = [...new Set(ownerIds)].filter(id => id !== actorId);
  if (others.length === 0) return ok(null);
  const owners = await db.user.findMany({
    where: { userId: { in: others } },
    select: {
      status: true,
      blocking: { where: { blockedId: actorId }, select: { id: true }, take: 1 },
      blockedBy: { where: { blockerId: actorId }, select: { id: true }, take: 1 },
    },
  });
  const allowed =
    owners.length === others.length &&
    owners.every(
      owner =>
        owner.status === 'active' && owner.blocking.length === 0 && owner.blockedBy.length === 0
    );
  return allowed ? ok(null) : fail(ErrorCode.FORBIDDEN);
};
