import { describe, expect, it } from 'vitest';

import { randomBytes } from 'node:crypto';

import { Prisma } from '@/generated/prisma/client';
import { decryptIp, encryptIp } from '@/lib/crypto';
import { withClient } from '@tests/db/admin';
import { checkLegacyCompatibility } from '@tests/db/legacy-compat';
import { createPost, createStock, createTag, createUser } from '@tests/factories';

import { getDb } from '.';

const IP_KEY = randomBytes(32);

const insertEvent = async (at?: Date): Promise<bigint> => {
  const event = await getDb().contentEvent.create({
    data: {
      actorUserId: 1,
      action: 'post_create',
      entityType: 'post',
      entityId: 1,
      ipEncrypted: encryptIp('203.0.113.7', IP_KEY),
      port: 51234,
      ...(at ? { at } : {}),
    },
  });
  return event.id;
};

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

describe('getDb', () => {
  it('reads explicit m2m mappings of the legacy implicit tables', async () => {
    const stock = await createStock({ ticker: 'THYAO' });
    const tag = await createTag({ tagName: '#bist100', slug: 'bist100' });
    const post = await createPost({ stockIds: [stock.stockId], tagIds: [tag.tagId] });

    const loaded = await getDb().post.findUniqueOrThrow({
      where: { postId: post.postId },
      include: { stocks: { include: { stock: true } }, tags: { include: { tag: true } } },
    });

    expect(loaded.stocks.map(s => s.stock.ticker)).toEqual(['THYAO']);
    expect(loaded.tags.map(t => t.tag.slug)).toEqual(['bist100']);
    expect(loaded.contentFormat).toBe(2);
  });

  it('rejects a duplicate Tag.slug', async () => {
    await createTag({ tagName: '#XU030', slug: 'xu030' });

    await expect(createTag({ tagName: '#xu030', slug: 'xu030' })).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('applies DB defaults to new User columns', async () => {
    const user = await createUser({ onboardedAt: null });

    expect(user.status).toBe('active');
    expect(user.onboardedAt).toBeNull();
    expect(user.createdAt).toBeInstanceOf(Date);
  });
});

describe('ContentEvent append-only', () => {
  it('stores the IP only encrypted and decrypts it with the key', async () => {
    const id = await insertEvent();
    const event = await getDb().contentEvent.findUniqueOrThrow({ where: { id } });

    expect(event).toMatchObject({ action: 'post_create', port: 51234 });
    expect(event.ipEncrypted).not.toBeNull();
    expect(Buffer.from(event.ipEncrypted ?? []).includes('203.0.113.7')).toBe(false);
    expect(decryptIp(event.ipEncrypted ?? new Uint8Array(), IP_KEY)).toBe('203.0.113.7');
    // DB'de enum etiketi noktalı biçimde
    const [raw] = await getDb().$queryRaw<{ action: string }[]>(
      Prisma.sql`SELECT action::text FROM "ContentEvent" WHERE id = ${id}`
    );
    expect(raw?.action).toBe('post.create');
  });

  it.each(['auth_login', 'session_start', 'comment_create'] as const)(
    'requires an IP for user-originated %s',
    async action => {
      await expect(
        getDb().contentEvent.create({
          data: { actorUserId: 1, action, entityType: 'user', entityId: 1 },
        })
      ).rejects.toThrow(/ContentEvent_ip_required/);
    }
  );

  it('allows system actions without an IP', async () => {
    const event = await getDb().contentEvent.create({
      data: { actorUserId: 1, action: 'system_remove', entityType: 'post', entityId: 1 },
    });
    expect(event.ipEncrypted).toBeNull();
  });

  it('rejects an out-of-range port', async () => {
    await expect(
      getDb().contentEvent.create({
        data: {
          actorUserId: 1,
          action: 'auth_login',
          entityType: 'user',
          entityId: 1,
          ipEncrypted: encryptIp('2001:db8::1', IP_KEY),
          port: 70_000,
        },
      })
    ).rejects.toThrow(/ContentEvent_port_range/);
  });

  it('rejects UPDATE', async () => {
    const id = await insertEvent();

    await expect(
      getDb().contentEvent.update({ where: { id }, data: { action: 'post_delete' } })
    ).rejects.toThrow(/append-only/);
  });

  it('rejects DELETE', async () => {
    const id = await insertEvent();

    await expect(getDb().contentEvent.delete({ where: { id } })).rejects.toThrow(/append-only/);
    await expect(getDb().$executeRaw`DELETE FROM "ContentEvent"`).rejects.toThrow(/append-only/);
  });

  it('rejects TRUNCATE', async () => {
    await insertEvent();
    const before = await getDb().contentEvent.count();

    await expect(getDb().$executeRaw`TRUNCATE "ContentEvent"`).rejects.toThrow(/append-only/);
    expect(await getDb().contentEvent.count()).toBe(before);
  });

  it.each(['30 days', '364 days', '11 months', '2 years 1 day', '3 years'])(
    'purge refuses retention %s (outside 1–2 years)',
    async retention => {
      await expect(
        getDb().$queryRaw(Prisma.sql`SELECT content_event_purge(${retention}::interval)`)
      ).rejects.toThrow(/1 ile 2 yıl arasında/);
    }
  );

  it('purge accepts the 1 and 2 year boundaries', async () => {
    for (const retention of ['1 year', '2 years']) {
      await expect(
        getDb().$queryRaw(Prisma.sql`SELECT content_event_purge(${retention}::interval)`)
      ).resolves.toBeDefined();
    }
  });

  it('purge deletes only events older than the retention period', async () => {
    const old = new Date(Date.now() - 3 * YEAR_MS);
    const oldId = await insertEvent(old);
    const recentId = await insertEvent();

    const [result] = await getDb().$queryRaw<{ deleted: bigint }[]>(
      Prisma.sql`SELECT content_event_purge(INTERVAL '2 years') AS deleted`
    );

    expect(result?.deleted).toBe(1n);
    const remaining = await getDb().contentEvent.findMany({
      where: { id: { in: [oldId, recentId] } },
      select: { id: true },
    });
    expect(remaining).toEqual([{ id: recentId }]);
    // Purge kendi transaction'ı dışında korumayı açık bırakmaz
    await expect(getDb().contentEvent.delete({ where: { id: recentId } })).rejects.toThrow(
      /append-only/
    );
  });
});

describe('ConsentEvent', () => {
  it('is append-only', async () => {
    const event = await getDb().consentEvent.create({
      data: {
        userId: 1,
        kind: 'marketing_email',
        granted: true,
        textVersion: '2026-10',
        source: 'signup',
      },
    });

    await expect(
      getDb().consentEvent.update({ where: { id: event.id }, data: { granted: false } })
    ).rejects.toThrow(/append-only/);
    await expect(getDb().consentEvent.delete({ where: { id: event.id } })).rejects.toThrow(
      /append-only/
    );
  });

  it('requires the text version when consent is granted, not when withdrawn', async () => {
    await expect(
      getDb().consentEvent.create({
        data: { userId: 1, kind: 'marketing_sms', granted: true, source: 'settings' },
      })
    ).rejects.toThrow(/ConsentEvent_text_version_required/);

    await expect(
      getDb().consentEvent.create({
        data: { userId: 1, kind: 'marketing_sms', granted: false, source: 'unsubscribe_link' },
      })
    ).resolves.toMatchObject({ granted: false, textVersion: null });
  });
});

describe('LegalIdentityRetention', () => {
  it('requires purgeAt after deletedAt', async () => {
    await expect(
      getDb().legalIdentityRetention.create({
        data: {
          userId: 1,
          firebaseUid: 'uid-1',
          email: 'deleted@example.test',
          deletedAt: new Date('2026-01-01'),
          purgeAt: new Date('2025-01-01'),
        },
      })
    ).rejects.toThrow(/LegalIdentityRetention_purge_after_delete/);
  });
});

describe('legacy (v1) app compatibility', () => {
  it('accepts v1-shaped INSERTs and fills new columns with defaults', async () => {
    const url = process.env.DATABASE_URL ?? '';
    expect(await withClient(url, checkLegacyCompatibility)).toEqual([]);
  });
});
