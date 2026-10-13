import 'server-only';

import type { Prisma } from '@/generated/prisma/client';

/**
 * Okuma tarafının görünürlük kuralı (S12; K-C'nin okuma karşılığı): içerik sahibinin hesabı
 * etkin olmalı ve görüntüleyenle arasında **iki yönlü** engel olmamalı (o seni ya da sen onu).
 * Anonimde yalnızca hesap durumu. Görüntüleyenin kendisi her zaman etkin olduğundan (askıdaki
 * oturum anonimdir) kendi içeriği bu filtreden geçer.
 */
export const visibleAuthorWhere = (viewerId: number | null): Prisma.UserWhereInput =>
  viewerId === null
    ? { status: 'active' }
    : {
        status: 'active',
        blocking: { none: { blockedId: viewerId } },
        blockedBy: { none: { blockerId: viewerId } },
      };

/** Silinmemiş ve yazarı görüntüleyene görünür gönderi. */
export const visiblePostWhere = (viewerId: number | null): Prisma.PostWhereInput => ({
  deletedAt: null,
  user: visibleAuthorWhere(viewerId),
});
