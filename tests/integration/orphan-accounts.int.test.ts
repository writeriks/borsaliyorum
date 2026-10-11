import { randomUUID } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { createUidLookup, purgeOrphanFirebaseAccounts } from '@/lib/auth/orphan-accounts';
import { withClient } from '@tests/db/admin';
import { workerDatabaseUrl } from '@tests/db/worker';
import { createUser } from '@tests/factories';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date();
const created = (days: number): string => new Date(NOW.getTime() - days * DAY).toUTCString();

describe('Firebase yetim hesap imhası (gerçek DB ile User eşleşmesi)', () => {
  it('User satırı olan hesap korunur; 31 günlük yetim silinir, 29 günlük kalır', async () => {
    const onboarded = await createUser();
    const orphanOld = `yetim-${randomUUID()}`;
    const orphanYoung = `yeni-${randomUUID()}`;
    const deleteUsers = vi.fn(async (uids: string[]) => ({
      successCount: uids.length,
      failureCount: 0,
    }));

    const summary = await withClient(workerDatabaseUrl(), client =>
      purgeOrphanFirebaseAccounts(
        {
          listUsers: async () => ({
            users: [
              { uid: onboarded.firebaseUserId, metadata: { creationTime: created(200) } },
              { uid: orphanOld, metadata: { creationTime: created(31) } },
              { uid: orphanYoung, metadata: { creationTime: created(29) } },
            ],
          }),
          deleteUsers,
          findUidsWithUser: createUidLookup(client),
          now: () => NOW,
        },
        { dryRun: false }
      )
    );

    expect(deleteUsers).toHaveBeenCalledExactlyOnceWith([orphanOld]);
    expect(summary).toEqual({ dryRun: false, scanned: 3, candidates: 1, deleted: 1, failed: 0 });
  });

  it('boş liste için sorgu atılmaz', async () => {
    const query = vi.fn();
    expect(await createUidLookup({ query })([])).toEqual(new Set());
    expect(query).not.toHaveBeenCalled();
  });
});
