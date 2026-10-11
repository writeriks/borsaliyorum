import 'server-only';

import type { PrismaClient } from '@/generated/prisma/client';
import { LEGAL_BUNDLE_DOCUMENT_VERSIONS, LEGAL_BUNDLE_VERSION } from '@/lib/legal/versions';

/**
 * Yasal metin paketinin güncel sürümünü kabul eder: paket sürümü, kabul edilen her belgenin
 * sürümü ve kabul anı (`termsAcceptedAt`) yazılır. Tekrar çağrılabilir (aynı değerler).
 */
export const acceptLegalBundle = async (
  db: PrismaClient,
  userId: number,
  now: Date
): Promise<void> => {
  await db.user.update({
    where: { userId },
    data: {
      legalBundleVersion: LEGAL_BUNDLE_VERSION,
      ...LEGAL_BUNDLE_DOCUMENT_VERSIONS,
      termsAcceptedAt: now,
      updatedAt: now,
    },
    select: { userId: true },
  });
};
