import { describe, expect, it, vi } from 'vitest';

import { SESSION_MAX_AGE_MS } from './cookies';
import {
  FIREBASE_BATCH_SIZE,
  type FirebaseAccount,
  isPastRetention,
  ORPHAN_PURGE_MAX_DELETIONS,
  ORPHAN_PURGE_PAGE_DELAY_MS,
  ORPHAN_RECENT_ACTIVITY_GRACE_MS,
  OrphanPurgeAbortError,
  type OrphanPurgeDeps,
  purgeOrphanFirebaseAccounts,
} from './orphan-accounts';

const NOW = new Date('2026-10-10T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const PROJECT = 'borsaliyorum-test';

/** Firebase'in metadata biçimi: `toUTCString()` */
const daysAgo = (days: number, now: Date = NOW): string =>
  new Date(now.getTime() - days * DAY).toUTCString();

const account = (
  uid: string,
  createdDaysAgo: number,
  lastSignInDaysAgo: number = createdDaysAgo
): FirebaseAccount => ({
  uid,
  metadata: { creationTime: daysAgo(createdDaysAgo), lastSignInTime: daysAgo(lastSignInDaysAgo) },
});

/** Sahte Firebase Admin: sayfalı `listUsers`, `deleteUsers` çağrılarını kaydeder. */
const fakeAdmin = (accounts: FirebaseAccount[], pageSize = FIREBASE_BATCH_SIZE) => {
  const store = [...accounts];
  const listUsers = vi.fn(async (_max: number, pageToken?: string) => {
    const start = pageToken ? Number(pageToken) : 0;
    const users = store.slice(start, start + pageSize);
    const next = start + pageSize < store.length ? String(start + pageSize) : undefined;
    return { users, pageToken: next };
  });
  const deleteUsers = vi.fn(async (uids: string[]) => ({
    successCount: uids.length,
    failureCount: 0,
  }));
  return { listUsers, deleteUsers };
};

/** Onboarding'i bitmiş hesaplar: oran freni (sayfa başına aday ≤ %20) için dolgu. */
const registered = (count: number, prefix = 'kayitli'): FirebaseAccount[] =>
  Array.from({ length: count }, (_, i) => account(`${prefix}-${i}`, 90));

const deps = (
  admin: ReturnType<typeof fakeAdmin>,
  withUser: readonly string[] = [],
  overrides: Partial<OrphanPurgeDeps> = {}
) => {
  const set = new Set(withUser);
  return {
    ...admin,
    findUidsWithUser: vi.fn(async (uids: readonly string[]) => {
      return new Set(uids.filter(uid => set.has(uid)));
    }),
    countUsers: vi.fn(async () => Math.max(set.size, 1)),
    readEnvironmentProjectId: vi.fn(async (): Promise<string | null> => PROJECT),
    sleep: vi.fn(async (_ms: number) => undefined),
    now: () => NOW,
    ...overrides,
  };
};

const options = (dryRun: boolean) => ({ dryRun, expectedProjectId: PROJECT });

describe('isPastRetention', () => {
  it('31 günlük hesap aday, 29 günlük değil (30 gün sınırı)', () => {
    expect(isPastRetention(account('a', 31), NOW)).toBe(true);
    expect(isPastRetention(account('b', 29), NOW)).toBe(false);
    expect(isPastRetention(account('c', 30), NOW)).toBe(false);
  });

  it('son girişten bu yana oturum çerezi ömrü + 1 gün geçmeden silinmez', () => {
    expect(ORPHAN_RECENT_ACTIVITY_GRACE_MS).toBeGreaterThanOrEqual(SESSION_MAX_AGE_MS + DAY);
    // 14 günlük çerez hâlâ geçerli olabilir → korunur
    expect(isPastRetention(account('a', 40, 6), NOW)).toBe(false);
    expect(isPastRetention(account('b', 40, 14.5), NOW)).toBe(false);
    // çerez ömrü + 1 gün geçmiş → aday
    expect(isPastRetention(account('c', 40, 15.5), NOW)).toBe(true);
  });

  it('okunamayan oluşturma zamanı → silinmez', () => {
    expect(isPastRetention({ uid: 'x', metadata: { creationTime: 'bozuk' } }, NOW)).toBe(false);
    expect(isPastRetention({ uid: 'y', metadata: { creationTime: '' } }, NOW)).toBe(false);
  });
});

describe('senaryo: 25. gün giriş → 31. gün iş → 32. gün onboarding', () => {
  it('31. gündeki koşu hesabı silmez (oturum çerezi 39. güne kadar geçerli)', async () => {
    const created = new Date('2026-09-01T09:00:00Z');
    const at = (day: number): Date => new Date(created.getTime() + day * DAY);
    const yetim: FirebaseAccount = {
      uid: 'gec-donen',
      metadata: { creationTime: created.toUTCString(), lastSignInTime: at(25).toUTCString() },
    };
    const admin = fakeAdmin([yetim, ...registered(9)]);
    const d = deps(
      admin,
      registered(9).map(a => a.uid),
      { now: () => at(31) }
    );

    const summary = await purgeOrphanFirebaseAccounts(d, options(false));

    expect(summary.candidates).toBe(0);
    expect(admin.deleteUsers).not.toHaveBeenCalled();
    // 32. gün: hesap Firebase'de duruyor → onboarding'in getUser kontrolü geçer
    expect(isPastRetention(yetim, at(32))).toBe(false);
  });
});

describe('purgeOrphanFirebaseAccounts', () => {
  it('yalnızca 30 günden eski ve User satırı olmayan hesapları siler', async () => {
    const filler = registered(8);
    const admin = fakeAdmin([
      account('yetim-31', 31),
      account('yetim-29', 29),
      account('kayitli-90', 90),
      account('yetim-400', 400),
      ...filler,
    ]);
    const d = deps(admin, ['kayitli-90', ...filler.map(a => a.uid)]);

    const summary = await purgeOrphanFirebaseAccounts(d, options(false));

    expect(summary).toEqual({
      dryRun: false,
      scanned: 12,
      candidates: 2,
      deleted: 2,
      failed: 0,
      capped: false,
    });
    expect(admin.deleteUsers).toHaveBeenCalledExactlyOnceWith(['yetim-31', 'yetim-400']);
  });

  it('dry-run: adayları sayar, hiçbir şey silmez', async () => {
    const filler = registered(8);
    const admin = fakeAdmin([account('yetim-31', 31), account('yetim-45', 45), ...filler]);
    const summary = await purgeOrphanFirebaseAccounts(
      deps(
        admin,
        filler.map(a => a.uid)
      ),
      options(true)
    );
    expect(summary).toMatchObject({ dryRun: true, scanned: 10, candidates: 2, deleted: 0 });
    expect(admin.deleteUsers).not.toHaveBeenCalled();
  });

  it('tüm sayfaları tarar; sayfalar arasında ≥1 sn bekler; her sayfa ayrı silinir', async () => {
    // Her sayfa: 1 yetim + 4 kayıtlı (oran %20, sınırda)
    const accounts = Array.from({ length: 3 }, (_, page) => [
      account(`yetim-${page}`, 60),
      ...registered(4, `k${page}`),
    ]).flat();
    const admin = fakeAdmin(accounts, 5);
    const d = deps(
      admin,
      accounts.filter(a => !a.uid.startsWith('yetim')).map(a => a.uid)
    );

    const summary = await purgeOrphanFirebaseAccounts(d, options(false));

    expect(admin.listUsers.mock.calls.map(call => call[1])).toEqual([undefined, '5', '10']);
    expect(admin.deleteUsers.mock.calls.map(call => call[0])).toEqual([
      ['yetim-0'],
      ['yetim-1'],
      ['yetim-2'],
    ]);
    expect(ORPHAN_PURGE_PAGE_DELAY_MS).toBeGreaterThanOrEqual(1000);
    expect(d.sleep).toHaveBeenCalledTimes(2);
    expect(d.sleep).toHaveBeenCalledWith(ORPHAN_PURGE_PAGE_DELAY_MS);
    expect(summary).toMatchObject({ scanned: 15, candidates: 3, deleted: 3 });
  });

  it('kısmi silme hatası özetlenir (script non-zero çıkar)', async () => {
    const filler = registered(8);
    const admin = fakeAdmin([account('a', 31), account('b', 31), ...filler]);
    admin.deleteUsers.mockResolvedValueOnce({ successCount: 1, failureCount: 1 });
    expect(
      await purgeOrphanFirebaseAccounts(
        deps(
          admin,
          filler.map(a => a.uid)
        ),
        options(false)
      )
    ).toMatchObject({ deleted: 1, failed: 1 });
  });

  it('hiç aday yoksa DB sorgusu ve silme yok', async () => {
    const fresh = fakeAdmin([account('yeni', 3)]);
    const d = deps(fresh);
    expect(await purgeOrphanFirebaseAccounts(d, options(false))).toMatchObject({
      scanned: 1,
      candidates: 0,
    });
    expect(d.findUidsWithUser).not.toHaveBeenCalled();
    expect(fresh.deleteUsers).not.toHaveBeenCalled();
  });

  it('DB sorgusu hata verirse hiçbir şey silinmez (hata yukarı iletilir)', async () => {
    const admin = fakeAdmin([account('a', 31)]);
    const d = deps(admin, [], {
      findUidsWithUser: vi.fn(async () => {
        throw new Error('db down');
      }),
    });
    await expect(purgeOrphanFirebaseAccounts(d, options(false))).rejects.toThrow('db down');
    expect(admin.deleteUsers).not.toHaveBeenCalled();
  });
});

describe('toplu silme frenleri', () => {
  it("bir sayfada aday oranı %20'yi aşarsa o sayfa silinmeden hata", async () => {
    // 2 yetim / 5 hesap = %40 (ör. yanlış DB'ye bağlanınca herkes "yetim" görünür)
    const admin = fakeAdmin([account('y1', 60), account('y2', 60), ...registered(3)]);
    const d = deps(
      admin,
      registered(3).map(a => a.uid)
    );
    const error = await purgeOrphanFirebaseAccounts(d, options(false)).catch(
      (thrown: unknown) => thrown
    );
    expect(error).toBeInstanceOf(OrphanPurgeAbortError);
    expect((error as OrphanPurgeAbortError).reason).toBe('page-ratio');
    expect(admin.deleteUsers).not.toHaveBeenCalled();
  });

  it("oran freni dry-run'da da hata verir (sorun gerçek koşudan önce görünsün)", async () => {
    const admin = fakeAdmin([account('y1', 60), account('y2', 60)]);
    await expect(purgeOrphanFirebaseAccounts(deps(admin), options(true))).rejects.toMatchObject({
      reason: 'page-ratio',
    });
  });

  it('User tablosu boşsa (yanlış/boş DB) hiçbir şey taranmadan iptal', async () => {
    const admin = fakeAdmin([account('y1', 60)]);
    const d = deps(admin, [], { countUsers: vi.fn(async () => 0) });
    await expect(purgeOrphanFirebaseAccounts(d, options(false))).rejects.toMatchObject({
      reason: 'empty-user-table',
    });
    expect(admin.listUsers).not.toHaveBeenCalled();
  });

  it('DB ortam etiketi Firebase projesiyle eşleşmezse ya da yoksa iptal', async () => {
    for (const label of ['borsaliyorum-prod', null]) {
      const admin = fakeAdmin([account('y1', 60)]);
      const d = deps(admin, [], { readEnvironmentProjectId: vi.fn(async () => label) });
      await expect(purgeOrphanFirebaseAccounts(d, options(false))).rejects.toMatchObject({
        reason: label === null ? 'environment-unlabeled' : 'environment-mismatch',
      });
      expect(admin.listUsers).not.toHaveBeenCalled();
    }
  });

  it(`tek koşuda en fazla ${ORPHAN_PURGE_MAX_DELETIONS} hesap silinir; kalanı sonraki koşuya`, async () => {
    // Her sayfa 100 hesap, 20 yetim (oran %20); 15 sayfa → 300 yetim
    const accounts = Array.from({ length: 15 }, (_, page) => [
      ...Array.from({ length: 20 }, (_, i) => account(`y-${page}-${i}`, 60)),
      ...registered(80, `k${page}`),
    ]).flat();
    const admin = fakeAdmin(accounts, 100);
    const d = deps(
      admin,
      accounts.filter(a => a.uid.startsWith('k')).map(a => a.uid)
    );

    const summary = await purgeOrphanFirebaseAccounts(d, options(false));

    const deletedUids = admin.deleteUsers.mock.calls.flatMap(call => call[0]);
    expect(deletedUids).toHaveLength(ORPHAN_PURGE_MAX_DELETIONS);
    expect(summary).toMatchObject({ deleted: ORPHAN_PURGE_MAX_DELETIONS, capped: true });
    // Sınıra ulaşınca tarama durur (gereksiz listUsers yok)
    expect(admin.listUsers).toHaveBeenCalledTimes(10);
  });
});
