import type { ContentEntityType, ContentEventAction, Prisma } from '@/generated/prisma/client';
import { encryptIp } from '@/lib/crypto';
import type { RequestMeta } from '@/lib/request-meta';

/**
 * ContentEvent (5651 / moderasyon / erişim izi) yazımı. Tablo append-only'dir; IP
 * AES-256-GCM ile şifrelenir (legal L2) ve `system.*` dışındaki her eylemde zorunludur (CHECK).
 * IP alınamadıysa satır yazılamaz: çağıran bunu `false` dönüşünden anlar ve loglar.
 */
export type ContentEventInput = {
  readonly actorUserId: number;
  readonly action: ContentEventAction;
  readonly entityType: ContentEntityType;
  readonly entityId: number;
  readonly meta: RequestMeta;
};

type ContentEventWriter = Pick<Prisma.TransactionClient, 'contentEvent'>;

export const recordContentEvent = async (
  db: ContentEventWriter,
  input: ContentEventInput,
  ipKey: Uint8Array
): Promise<boolean> => {
  if (input.meta.ip === null) return false;
  await db.contentEvent.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ipEncrypted: encryptIp(input.meta.ip, ipKey),
      port: input.meta.port,
      requestId: input.meta.requestId,
    },
  });
  return true;
};
