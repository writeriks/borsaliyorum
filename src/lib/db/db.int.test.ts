import { describe, expect, it } from 'vitest';

import { Prisma } from '@/generated/prisma/client';
import { withClient } from '@tests/db/admin';
import { checkLegacyCompatibility } from '@tests/db/legacy-compat';
import { createPost, createStock, createTag, createUser } from '@tests/factories';

import { getDb } from '.';

const insertEvent = async (at?: Date): Promise<bigint> => {
  const event = await getDb().contentEvent.create({
    data: {
      actorUserId: 1,
      action: 'post.create',
      entityType: 'post',
      entityId: 1,
      ip: '203.0.113.7',
      ...(at ? { at } : {}),
    },
  });
  return event.id;
};

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
  it('allows inserts', async () => {
    const id = await insertEvent();
    expect(await getDb().contentEvent.findUnique({ where: { id } })).toMatchObject({
      action: 'post.create',
      ip: '203.0.113.7',
    });
  });

  it('rejects UPDATE', async () => {
    const id = await insertEvent();

    await expect(
      getDb().contentEvent.update({ where: { id }, data: { action: 'post.delete' } })
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

  it('purge refuses retention shorter than one year', async () => {
    await expect(getDb().$queryRaw`SELECT content_event_purge(INTERVAL '30 days')`).rejects.toThrow(
      /en az 1 yıl/
    );
  });

  it('purge deletes only events older than the retention period', async () => {
    const old = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
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

describe('legacy (v1) app compatibility', () => {
  it('accepts v1-shaped INSERTs and fills new columns with defaults', async () => {
    const url = process.env.DATABASE_URL ?? '';
    expect(await withClient(url, checkLegacyCompatibility)).toEqual([]);
  });
});
