import { describe, expect, it, vi } from 'vitest';

import { getDb } from '@/lib/db';

import {
  createPost,
  createStock,
  createTag,
  createUser,
  followStock,
} from '../../../../tests/factories';

vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => null }));

const { getFollowedStocks, queryFollowedStocks, queryTrendingTags } = await import('./aside');

describe('gündem etiketleri (30 gün)', () => {
  it('kullanım sayısına göre; pencere dışı, silinmiş, askıdaki yazar ve slug’sız etiket hariç', async () => {
    const now = new Date('2026-10-11T12:00:00Z');
    const daysAgo = (d: number): Date => new Date(now.getTime() - d * 86_400_000);
    const author = await createUser();
    const suspended = await createUser({ status: 'suspended' });
    const bist = await createTag({ tagName: '#BIST100', slug: 'bist100' });
    const altin = await createTag({ tagName: '#altın', slug: 'altin' });
    const eski = await createTag({ tagName: '#eski', slug: 'eski' });
    const legacy = await createTag({ tagName: '#legacy', slug: null });

    for (let i = 0; i < 3; i += 1) {
      await createPost({ userId: author.userId, tagIds: [bist.tagId], createdAt: daysAgo(i) });
    }
    await createPost({
      userId: author.userId,
      tagIds: [altin.tagId, legacy.tagId],
      createdAt: daysAgo(29),
    });
    await createPost({ userId: author.userId, tagIds: [eski.tagId], createdAt: daysAgo(31) });
    await createPost({
      userId: author.userId,
      tagIds: [altin.tagId],
      deletedAt: now,
      createdAt: daysAgo(1),
    });
    for (let i = 0; i < 5; i += 1) {
      await createPost({ userId: suspended.userId, tagIds: [eski.tagId], createdAt: daysAgo(1) });
    }

    expect(await queryTrendingTags(getDb(), now)).toEqual([
      { slug: 'bist100', name: 'BIST100', count: 3 },
      { slug: 'altin', name: 'altın', count: 1 },
    ]);
    expect(await queryTrendingTags(getDb(), now, 1)).toHaveLength(1);
  });
});

describe('takip edilen hisseler', () => {
  it('yalnızca görüntüleyeninkiler, kod sırasıyla; anonim → boş', async () => {
    const viewer = await createUser();
    const other = await createUser();
    const b = await createStock({ ticker: 'ZZBBB', companyName: 'B A.Ş.' });
    const a = await createStock({ ticker: 'ZZAAA', companyName: 'A A.Ş.' });
    const c = await createStock({ ticker: 'ZZCCC' });
    await followStock(viewer.userId, b.stockId);
    await followStock(viewer.userId, a.stockId);
    await followStock(other.userId, c.stockId);

    expect(await queryFollowedStocks(getDb(), viewer.userId)).toEqual([
      { ticker: 'ZZAAA', companyName: 'A A.Ş.' },
      { ticker: 'ZZBBB', companyName: 'B A.Ş.' },
    ]);
    expect(await getFollowedStocks()).toEqual([]);
  });
});
