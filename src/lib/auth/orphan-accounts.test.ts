import { describe, expect, it, vi } from 'vitest';

import {
  FIREBASE_BATCH_SIZE,
  type FirebaseAccount,
  isPastRetention,
  type OrphanPurgeDeps,
  purgeOrphanFirebaseAccounts,
} from './orphan-accounts';

const NOW = new Date('2026-10-10T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

/** Firebase'in metadata biçimi: `toUTCString()` */
const daysAgo = (days: number): string => new Date(NOW.getTime() - days * DAY).toUTCString();

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

const deps = (
  admin: ReturnType<typeof fakeAdmin>,
  withUser: readonly string[] = []
): OrphanPurgeDeps & { findUidsWithUser: ReturnType<typeof vi.fn> } => ({
  ...admin,
  findUidsWithUser: vi.fn(async (uids: readonly string[]) => {
    const set = new Set(withUser);
    return new Set(uids.filter(uid => set.has(uid)));
  }),
  now: () => NOW,
});

describe('isPastRetention', () => {
  it('31 günlük hesap aday, 29 günlük değil (30 gün sınırı)', () => {
    expect(isPastRetention(account('a', 31), NOW)).toBe(true);
    expect(isPastRetention(account('b', 29), NOW)).toBe(false);
    expect(isPastRetention(account('c', 30), NOW)).toBe(false);
  });

  it('son 24 saatte giriş yapan eski hesap atlanır (onboarding ortasında silinmesin)', () => {
    expect(isPastRetention(account('a', 40, 0.5), NOW)).toBe(false);
    expect(isPastRetention(account('b', 40, 2), NOW)).toBe(true);
  });

  it('okunamayan oluşturma zamanı → silinmez', () => {
    expect(isPastRetention({ uid: 'x', metadata: { creationTime: 'bozuk' } }, NOW)).toBe(false);
    expect(isPastRetention({ uid: 'y', metadata: { creationTime: '' } }, NOW)).toBe(false);
  });
});

describe('purgeOrphanFirebaseAccounts', () => {
  it('yalnızca 30 günden eski ve User satırı olmayan hesapları siler', async () => {
    const admin = fakeAdmin([
      account('yetim-31', 31),
      account('yetim-29', 29),
      account('kayitli-90', 90),
      account('yetim-400', 400),
    ]);
    const d = deps(admin, ['kayitli-90']);

    const summary = await purgeOrphanFirebaseAccounts(d, { dryRun: false });

    expect(summary).toEqual({ dryRun: false, scanned: 4, candidates: 2, deleted: 2, failed: 0 });
    expect(admin.deleteUsers).toHaveBeenCalledTimes(1);
    expect(admin.deleteUsers).toHaveBeenCalledWith(['yetim-31', 'yetim-400']);
    // DB'ye yalnızca yaşı dolanlar sorulur
    expect(d.findUidsWithUser).toHaveBeenCalledWith(['yetim-31', 'kayitli-90', 'yetim-400']);
  });

  it('dry-run: adayları sayar, hiçbir şey silmez', async () => {
    const admin = fakeAdmin([account('yetim-31', 31), account('yetim-45', 45)]);
    const summary = await purgeOrphanFirebaseAccounts(deps(admin), { dryRun: true });
    expect(summary).toEqual({ dryRun: true, scanned: 2, candidates: 2, deleted: 0, failed: 0 });
    expect(admin.deleteUsers).not.toHaveBeenCalled();
  });

  it('tüm sayfaları tarar (pageToken); her sayfa ayrı silinir (≤1000 uid)', async () => {
    const accounts = Array.from({ length: 5 }, (_, i) => account(`u${i}`, 60));
    const admin = fakeAdmin(accounts, 2);
    const summary = await purgeOrphanFirebaseAccounts(deps(admin), { dryRun: false });
    expect(admin.listUsers).toHaveBeenCalledTimes(3);
    expect(admin.listUsers.mock.calls.map(call => call[1])).toEqual([undefined, '2', '4']);
    expect(admin.deleteUsers.mock.calls.map(call => call[0])).toEqual([
      ['u0', 'u1'],
      ['u2', 'u3'],
      ['u4'],
    ]);
    expect(summary).toMatchObject({ scanned: 5, candidates: 5, deleted: 5 });
  });

  it('kısmi silme hatası özetlenir; hiç aday yoksa DB sorgusu ve silme yok', async () => {
    const admin = fakeAdmin([account('a', 31), account('b', 31)]);
    admin.deleteUsers.mockResolvedValueOnce({ successCount: 1, failureCount: 1 });
    expect(await purgeOrphanFirebaseAccounts(deps(admin), { dryRun: false })).toMatchObject({
      deleted: 1,
      failed: 1,
    });

    const fresh = fakeAdmin([account('yeni', 3)]);
    const d = deps(fresh);
    expect(await purgeOrphanFirebaseAccounts(d, { dryRun: false })).toMatchObject({
      scanned: 1,
      candidates: 0,
    });
    expect(d.findUidsWithUser).not.toHaveBeenCalled();
    expect(fresh.deleteUsers).not.toHaveBeenCalled();
  });

  it('DB sorgusu hata verirse hiçbir şey silinmez (hata yukarı iletilir)', async () => {
    const admin = fakeAdmin([account('a', 31)]);
    const d = deps(admin);
    d.findUidsWithUser.mockRejectedValueOnce(new Error('db down'));
    await expect(purgeOrphanFirebaseAccounts(d, { dryRun: false })).rejects.toThrow('db down');
    expect(admin.deleteUsers).not.toHaveBeenCalled();
  });
});
