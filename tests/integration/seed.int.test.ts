import { describe, expect, it } from 'vitest';

import { getDb } from '@/lib/db';

import { runSeed } from '../../prisma/seed-data/run-seed';

describe('synthetic seed', () => {
  it('populates stocks, users, tags and posts and is idempotent', async () => {
    const first = await runSeed(getDb());
    const second = await runSeed(getDb());

    expect(second).toEqual(first);
    expect(await getDb().stock.count()).toBe(14);
    expect(await getDb().user.count()).toBe(4);
    expect(await getDb().post.count()).toBe(4);

    const legacy = await getDb().post.findFirstOrThrow({
      where: { contentFormat: 1 },
      include: { stocks: { include: { stock: true } }, tags: { include: { tag: true } } },
    });
    expect(legacy.stocks.map(s => s.stock.ticker)).toEqual(['THYAO']);
    expect(legacy.tags.map(t => t.tag.slug)).toEqual(['bist100']);

    const users = await getDb().user.findMany({ select: { email: true } });
    expect(users.every(user => user.email.endsWith('@example.test'))).toBe(true);
  });
});
