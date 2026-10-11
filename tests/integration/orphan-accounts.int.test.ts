import { randomBytes, randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { completeOnboardingForIdentity } from '@/features/auth/server/onboarding';
import {
  createEnvironmentReader,
  createUidLookup,
  createUserCounter,
  type FirebaseAccount,
  type OrphanPurgeDeps,
  purgeOrphanFirebaseAccounts,
} from '@/lib/auth/orphan-accounts';
import { getDb } from '@/lib/db';
import type { Logger } from '@/lib/logger';
import { withClient } from '@tests/db/admin';
import { workerDatabaseUrl } from '@tests/db/worker';
import { createUser } from '@tests/factories';

const DAY = 24 * 60 * 60 * 1000;
const PROJECT = 'demo-borsaliyorum-int';
const NOW = new Date();
const created = (days: number, now: Date = NOW): string =>
  new Date(now.getTime() - days * DAY).toUTCString();

const labelEnvironment = (projectId: string = PROJECT): Promise<unknown> =>
  getDb().$executeRaw`
    INSERT INTO "DeploymentEnvironment" ("id", "firebaseProjectId", "label")
    VALUES (1, ${projectId}, 'test')
    ON CONFLICT ("id") DO UPDATE SET "firebaseProjectId" = EXCLUDED."firebaseProjectId"`;

/** Kayıtlı (User satırı olan) hesaplar: sayfa oranı freninin altında kalmak için dolgu. */
const registeredAccounts = async (count: number): Promise<FirebaseAccount[]> => {
  const users = await Promise.all(Array.from({ length: count }, () => createUser()));
  return users.map(user => ({
    uid: user.firebaseUserId,
    metadata: { creationTime: created(200) },
  }));
};

const realDbDeps = (
  client: Parameters<typeof createUidLookup>[0],
  users: readonly FirebaseAccount[],
  deleteUsers: OrphanPurgeDeps['deleteUsers'],
  now: Date = NOW
): OrphanPurgeDeps => ({
  listUsers: async () => ({ users }),
  deleteUsers,
  findUidsWithUser: createUidLookup(client),
  countUsers: createUserCounter(client),
  readEnvironmentProjectId: createEnvironmentReader(client),
  sleep: async () => undefined,
  now: () => now,
});

const log: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: () => log,
};

beforeEach(async () => {
  await labelEnvironment();
});

describe('Firebase yetim hesap imhası (gerçek DB ile User eşleşmesi)', () => {
  it('User satırı olan hesap korunur; 31 günlük yetim silinir, 29 günlük kalır', async () => {
    const registered = await registeredAccounts(5);
    const orphanOld = `yetim-${randomUUID()}`;
    const orphanYoung = `yeni-${randomUUID()}`;
    const deleteUsers = vi.fn(async (uids: string[]) => ({
      successCount: uids.length,
      failureCount: 0,
    }));

    const summary = await withClient(workerDatabaseUrl(), client =>
      purgeOrphanFirebaseAccounts(
        realDbDeps(
          client,
          [
            ...registered,
            { uid: orphanOld, metadata: { creationTime: created(31) } },
            { uid: orphanYoung, metadata: { creationTime: created(29) } },
          ],
          deleteUsers
        ),
        { dryRun: false, expectedProjectId: PROJECT }
      )
    );

    expect(deleteUsers).toHaveBeenCalledExactlyOnceWith([orphanOld]);
    expect(summary).toEqual({
      dryRun: false,
      scanned: 7,
      candidates: 1,
      deleted: 1,
      failed: 0,
      capped: false,
    });
  });

  it('DB ortam etiketi başka bir Firebase projesine aitse hiçbir şey taranmaz', async () => {
    await labelEnvironment('borsaliyorum-prod');
    const deleteUsers = vi.fn();
    await expect(
      withClient(workerDatabaseUrl(), client =>
        purgeOrphanFirebaseAccounts(
          realDbDeps(client, [{ uid: 'x', metadata: { creationTime: created(90) } }], deleteUsers),
          { dryRun: false, expectedProjectId: PROJECT }
        )
      )
    ).rejects.toMatchObject({ reason: 'environment-mismatch' });
    expect(deleteUsers).not.toHaveBeenCalled();
  });

  it('pg yardımcıları: kullanıcı sayısı ve ortam etiketi okunur; boş liste için sorgu yok', async () => {
    await createUser();
    await withClient(workerDatabaseUrl(), async client => {
      expect(await createUserCounter(client)()).toBeGreaterThan(0);
      expect(await createEnvironmentReader(client)()).toBe(PROJECT);
    });
    const query = vi.fn();
    expect(await createUidLookup({ query })([])).toEqual(new Set());
    expect(query).not.toHaveBeenCalled();
  });
});

describe('senaryo: 25. gün giriş → 31. gün imha koşusu → 32. gün onboarding', () => {
  it("hesap silinmez ve kullanıcı onboarding'i tamamlar", async () => {
    const createdAt = new Date(NOW.getTime() - 40 * DAY);
    const at = (day: number): Date => new Date(createdAt.getTime() + day * DAY);
    const uid = `gec-donen-${randomUUID()}`;
    // Sahte Firebase: hesap, silinene kadar "var"
    const firebase = new Map<string, FirebaseAccount>([
      [
        uid,
        {
          uid,
          metadata: {
            creationTime: createdAt.toUTCString(),
            lastSignInTime: at(25).toUTCString(),
          },
        },
      ],
    ]);
    const registered = await registeredAccounts(5);
    const deleteUsers = vi.fn(async (uids: string[]) => {
      for (const id of uids) firebase.delete(id);
      return { successCount: uids.length, failureCount: 0 };
    });

    // 31. gün: zamanlanmış koşu
    const summary = await withClient(workerDatabaseUrl(), client =>
      purgeOrphanFirebaseAccounts(
        realDbDeps(client, [...firebase.values(), ...registered], deleteUsers, at(31)),
        { dryRun: false, expectedProjectId: PROJECT }
      )
    );
    expect(summary.candidates).toBe(0);
    expect(firebase.has(uid)).toBe(true);

    // 32. gün: kullanıcı (14 günlük çerezi hâlâ geçerli) onboarding'i gönderir
    const result = await completeOnboardingForIdentity(
      {
        firebaseUid: uid,
        email: `${uid}@example.test`,
        emailVerified: true,
        suggestedDisplayName: null,
        existingUserId: null,
      },
      {
        username: `gec_${randomBytes(3).toString('hex')}`,
        displayName: 'Geç Dönen',
        ageConfirmed: true,
        termsAccepted: true,
        noticeAcknowledged: true,
        marketingOptIn: false,
        next: null,
      },
      { ip: '203.0.113.9', port: null, requestId: 'req-32' },
      {
        db: getDb(),
        ipKey: () => new Uint8Array(randomBytes(32)),
        now: () => at(32),
        log,
        marketingConsentEnabled: false,
        firebaseAccountExists: async id => firebase.has(id),
      }
    );
    expect(result.ok).toBe(true);
    expect(await getDb().user.count({ where: { firebaseUserId: uid } })).toBe(1);
  });
});
