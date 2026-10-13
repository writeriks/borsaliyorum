import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { encryptIp } from '@/lib/crypto';
import { getDb } from '@/lib/db';
import { runRetentionPurge } from '@/lib/db/retention';
import { withClient } from '@tests/db/admin';
import { workerDatabaseUrl } from '@tests/db/worker';
import { createPost } from '@tests/factories';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number): Date => new Date(Date.now() - ms);
const purge = (contentEventRetention?: string): ReturnType<typeof runRetentionPurge> =>
  withClient(workerDatabaseUrl(), client =>
    runRetentionPurge(client, contentEventRetention ? { contentEventRetention } : {})
  );

const key = randomBytes(32);
const createEvent = (at: Date): Promise<{ id: bigint }> =>
  getDb().contentEvent.create({
    data: {
      actorUserId: 1,
      action: 'session_start',
      entityType: 'user',
      entityId: 1,
      ipEncrypted: encryptIp('198.51.100.4', key),
      at,
    },
    select: { id: true },
  });

const createPreview = (urlHash: string, expiresAt: Date): Promise<{ id: number }> =>
  getDb().linkPreview.create({
    data: {
      urlHash: urlHash.padEnd(64, '0'),
      url: `https://example.com/${urlHash}`,
      status: 'ok',
      expiresAt,
    },
    select: { id: true },
  });

describe('runRetentionPurge', () => {
  it('deletes only expired rows of every table', async () => {
    const oldEvent = await createEvent(ago(2 * 365 * DAY + 10 * DAY));
    const recentEvent = await createEvent(ago(400 * DAY));

    await getDb().rateLimitBucket.createMany({
      data: [
        { key: 'post.create:u:1', windowStart: ago(49 * HOUR), count: 3 },
        { key: 'post.create:u:1', windowStart: ago(47 * HOUR), count: 3 },
        // IP anahtarlı (hash'li) kovalar en geç 24 saatte silinir (legal kararı)
        { key: 'auth.session.ip:old', windowStart: ago(25 * HOUR), count: 1 },
        { key: 'auth.session.ip:new', windowStart: ago(23 * HOUR), count: 1 },
      ],
    });

    const expiredOrphan = await createPreview('a', ago(DAY));
    const expiredReferenced = await createPreview('b', ago(DAY));
    const fresh = await createPreview('c', new Date(Date.now() + DAY));
    await createPost({ linkPreviewId: expiredReferenced.id });

    await getDb().legalIdentityRetention.createMany({
      data: [
        {
          userId: 1,
          firebaseUid: 'uid-old',
          email: 'old@example.test',
          deletedAt: ago(800 * DAY),
          purgeAt: ago(DAY),
        },
        {
          userId: 2,
          firebaseUid: 'uid-new',
          email: 'new@example.test',
          deletedAt: ago(DAY),
          purgeAt: new Date(Date.now() + 700 * DAY),
        },
      ],
    });

    const summary = await purge();

    expect(summary).toEqual({
      contentEvents: 1,
      rateLimitBuckets: 2,
      linkPreviews: 1,
      legalIdentities: 1,
      consentEvents: 0,
    });
    const events = await getDb().contentEvent.findMany({ select: { id: true } });
    expect(events.map(e => e.id)).toEqual([recentEvent.id]);
    expect(events.map(e => e.id)).not.toContain(oldEvent.id);
    expect(
      (await getDb().rateLimitBucket.findMany({ orderBy: { key: 'asc' } })).map(b => b.key)
    ).toEqual(['auth.session.ip:new', 'post.create:u:1']);
    const previews = await getDb().linkPreview.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    expect(previews.map(p => p.id)).toEqual([expiredReferenced.id, fresh.id]);
    expect(previews.map(p => p.id)).not.toContain(expiredOrphan.id);
    expect(await getDb().legalIdentityRetention.findMany({ select: { userId: true } })).toEqual([
      { userId: 2 },
    ]);

    // İkinci koşu bir şey silmez (idempotent)
    expect(await purge()).toEqual({
      contentEvents: 0,
      rateLimitBuckets: 0,
      linkPreviews: 0,
      legalIdentities: 0,
      consentEvents: 0,
    });
  });

  it('refuses a ContentEvent retention outside 1–2 years before touching anything', async () => {
    await getDb().rateLimitBucket.create({
      data: { key: 'x', windowStart: ago(100 * HOUR), count: 1 },
    });
    const before = await getDb().rateLimitBucket.count();

    await expect(purge('6 months')).rejects.toThrow(/1 ile 2 yıl/);
    await expect(purge('3 years')).rejects.toThrow(/1 ile 2 yıl/);
    expect(await getDb().rateLimitBucket.count()).toBe(before);
  });

  it('ConsentEvent: izin sona erdikten 3 yıl sonra (userId, kind) geçmişi silinir', async () => {
    const YEAR = 365 * DAY;
    const consent = (
      userId: number,
      granted: boolean,
      at: Date,
      kind: 'marketing_email' | 'marketing_sms' = 'marketing_email'
    ) => ({
      userId,
      kind,
      granted,
      textVersion: granted ? '2026-10-v2' : null,
      source: granted ? ('signup' as const) : ('settings' as const),
      at,
    });
    await getDb().consentEvent.createMany({
      data: [
        // 1: 4 yıl önce verildi, 3 yıl + 10 gün önce geri alındı → tüm geçmiş silinir
        consent(9001, true, ago(4 * YEAR)),
        consent(9001, false, ago(3 * YEAR + 10 * DAY)),
        // 1 / sms: aynı kullanıcının hâlâ geçerli izni → kalır
        consent(9001, true, ago(5 * YEAR), 'marketing_sms'),
        // 2: 2 yıl önce geri alındı → süre dolmadı, kalır
        consent(9002, true, ago(4 * YEAR)),
        consent(9002, false, ago(2 * YEAR)),
        // 3: eski geri alma sonra yeniden verildi → son olay granted, kalır
        consent(9003, false, ago(5 * YEAR)),
        consent(9003, true, ago(4 * YEAR)),
      ],
    });

    expect(await purge()).toMatchObject({ consentEvents: 2 });

    const left = await getDb().consentEvent.findMany({
      where: { userId: { in: [9001, 9002, 9003] } },
      select: { userId: true, kind: true },
      orderBy: [{ userId: 'asc' }, { at: 'asc' }],
    });
    expect(left).toEqual([
      { userId: 9001, kind: 'marketing_sms' },
      { userId: 9002, kind: 'marketing_email' },
      { userId: 9002, kind: 'marketing_email' },
      { userId: 9003, kind: 'marketing_email' },
      { userId: 9003, kind: 'marketing_email' },
    ]);
    // Append-only koruması temizlik dışında hâlâ geçerli
    await expect(getDb().consentEvent.deleteMany({ where: { userId: 9002 } })).rejects.toThrow(
      /append-only/
    );
  });

  it('ConsentEvent saklama süresi 3 yıldan kısa verilemez', async () => {
    await expect(
      withClient(workerDatabaseUrl(), client =>
        runRetentionPurge(client, { consentEventRetention: '2 years' })
      )
    ).rejects.toThrow(/en az 3 yıl/);
  });
});
