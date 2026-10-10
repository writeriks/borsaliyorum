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
      rateLimitBuckets: 1,
      linkPreviews: 1,
      legalIdentities: 1,
    });
    const events = await getDb().contentEvent.findMany({ select: { id: true } });
    expect(events.map(e => e.id)).toEqual([recentEvent.id]);
    expect(events.map(e => e.id)).not.toContain(oldEvent.id);
    expect((await getDb().rateLimitBucket.findMany()).length).toBe(1);
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
});
