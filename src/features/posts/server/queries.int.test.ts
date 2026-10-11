import { describe, expect, it, vi } from 'vitest';

import { getDb } from '@/lib/db';

import {
  createComment,
  createPost,
  createStock,
  createUser,
  likePost,
} from '../../../../tests/factories';

vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => null }));

const { getMyRecentPosts, listOwnRecentPosts } = await import('./queries');

describe('listOwnRecentPosts', () => {
  it('yalnızca kendi silinmemiş gönderileri, yeniden eskiye; beğeni/sahiplik/sayaç/mention DTO', async () => {
    const stock = await createStock({ ticker: 'TUPRS' });
    const viewer = await createUser();
    const other = await createUser({ username: 'anilan_kisi', displayName: 'Anılan Kişi' });
    const older = await createPost({
      userId: viewer.userId,
      content: '$TUPRS @anilan_kisi',
      createdAt: new Date('2026-10-01T10:00:00Z'),
      entities: {
        v: 1,
        items: [
          { type: 'cashtag', start: 0, end: 6, ticker: 'TUPRS', stockId: stock.stockId },
          { type: 'mention', start: 7, end: 19, username: 'anilan_kisi', userId: other.userId },
        ],
      },
      stockIds: [stock.stockId],
    });
    const newer = await createPost({
      userId: viewer.userId,
      createdAt: new Date('2026-10-02T10:00:00Z'),
    });
    await createPost({ userId: viewer.userId, deletedAt: new Date() });
    await createPost({ userId: other.userId });
    await likePost(viewer.userId, older.postId);
    await likePost(other.userId, older.postId);

    const posts = await listOwnRecentPosts(getDb(), viewer.userId);
    expect(posts.map(p => p.id)).toEqual([newer.postId, older.postId]);
    const card = posts[1];
    expect(card).toMatchObject({
      author: { username: viewer.username },
      counts: { likes: 2, comments: 0, reposts: 0 },
      viewer: { liked: true, isOwner: true },
      stocks: { TUPRS: { ticker: 'TUPRS', stockType: 'stock' } },
      linkPreview: { status: 'none' },
    });
    expect(card?.body.entities).toContainEqual(
      expect.objectContaining({
        type: 'mention',
        username: 'anilan_kisi',
        displayName: 'Anılan Kişi',
      })
    );
    expect(JSON.stringify(posts)).not.toContain(viewer.email);
    expect(posts[0]?.viewer).toEqual({ liked: false, isOwner: true });
  });

  it('yorum sayacı silinmiş (soft delete) yorumları saymaz', async () => {
    const viewer = await createUser();
    const post = await createPost({ userId: viewer.userId });
    await createComment({ postId: post.postId });
    await createComment({ postId: post.postId, deletedAt: new Date() });
    await createComment({ postId: post.postId, deletedAt: new Date(), removedByModeration: true });
    const [card] = await listOwnRecentPosts(getDb(), viewer.userId);
    expect(card?.counts.comments).toBe(1);
  });

  it('anonim görüntüleyen için boş liste (DAL)', async () => {
    expect(await getMyRecentPosts()).toEqual([]);
  });
});
