import { describe, expect, it, vi } from 'vitest';

import { getDb } from '@/lib/db';

import {
  blockUser,
  createComment,
  createPost,
  createStock,
  createUser,
  likePost,
} from '../../../../tests/factories';

vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => null }));

const { findPostDetail, getMyRecentPosts, listOwnRecentPosts } = await import('./queries');

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

describe('findPostDetail', () => {
  it('olmayan ya da aralık dışı kimlik → not-found', async () => {
    expect(await findPostDetail(getDb(), null, 2_000_000_000)).toEqual({ status: 'not-found' });
    expect(await findPostDetail(getDb(), null, 0)).toEqual({ status: 'not-found' });
    expect(await findPostDetail(getDb(), null, 2_147_483_648)).toEqual({ status: 'not-found' });
  });

  it('anonim okur: kart salt okunur (viewer yok), tam gövde, sayaçlar; e-posta sızmaz', async () => {
    const author = await createUser({ displayName: 'Yazar Kişi' });
    const post = await createPost({ userId: author.userId, content: 'uzun bir gönderi metni' });
    await createComment({ postId: post.postId });
    await likePost(author.userId, post.postId);
    const detail = await findPostDetail(getDb(), null, post.postId);
    expect(detail.status).toBe('ok');
    if (detail.status !== 'ok') return;
    expect(detail.post).not.toHaveProperty('viewer');
    expect(detail.post).toMatchObject({
      id: post.postId,
      author: { username: author.username, displayName: 'Yazar Kişi' },
      body: { text: 'uzun bir gönderi metni' },
      counts: { likes: 1, comments: 1 },
    });
    expect(JSON.stringify(detail)).not.toContain(author.email);
  });

  it('girişli görüntüleyen: beğeni ve sahiplik', async () => {
    const viewer = await createUser();
    const own = await createPost({ userId: viewer.userId });
    await likePost(viewer.userId, own.postId);
    const detail = await findPostDetail(getDb(), { userId: viewer.userId }, own.postId);
    expect(detail.status === 'ok' && detail.post.viewer).toEqual({ liked: true, isOwner: true });
  });

  it('silinmiş → removed; moderasyon metni yalnızca sahibine', async () => {
    const owner = await createUser();
    const other = await createUser();
    const byOwner = await createPost({ userId: owner.userId, deletedAt: new Date() });
    const byMod = await createPost({
      userId: owner.userId,
      deletedAt: new Date(),
      removedByModeration: true,
    });
    const db = getDb();
    expect(await findPostDetail(db, { userId: owner.userId }, byOwner.postId)).toEqual({
      status: 'removed',
      byModeration: false,
    });
    expect(await findPostDetail(db, { userId: owner.userId }, byMod.postId)).toEqual({
      status: 'removed',
      byModeration: true,
    });
    expect(await findPostDetail(db, { userId: other.userId }, byMod.postId)).toEqual({
      status: 'removed',
      byModeration: false,
    });
    expect(await findPostDetail(db, null, byMod.postId)).toEqual({
      status: 'removed',
      byModeration: false,
    });
  });

  it('iki yönlü engel ve etkin olmayan yazar → unavailable; anonim engelden etkilenmez', async () => {
    const viewer = await createUser();
    const blockedByViewer = await createUser();
    const blockerOfViewer = await createUser();
    const suspended = await createUser({ status: 'suspended' });
    await blockUser(viewer.userId, blockedByViewer.userId);
    await blockUser(blockerOfViewer.userId, viewer.userId);
    const a = await createPost({ userId: blockedByViewer.userId });
    const b = await createPost({ userId: blockerOfViewer.userId });
    const c = await createPost({ userId: suspended.userId });
    const db = getDb();
    const me = { userId: viewer.userId };
    expect(await findPostDetail(db, me, a.postId)).toEqual({ status: 'unavailable' });
    expect(await findPostDetail(db, me, b.postId)).toEqual({ status: 'unavailable' });
    expect(await findPostDetail(db, me, c.postId)).toEqual({ status: 'unavailable' });
    expect(await findPostDetail(db, null, c.postId)).toEqual({ status: 'unavailable' });
    expect((await findPostDetail(db, null, b.postId)).status).toBe('ok');
  });

  it('eski format gövde: markup düz metne, mention kullanıcı adından çözülür', async () => {
    await createStock({ ticker: 'ASELS' });
    const mentioned = await createUser({ username: 'Eski_Uye', displayName: 'Eski Üye' });
    const post = await createPost({
      content: '$(ASELS) için @(eski_uye) ne der?',
      contentFormat: 1,
    });
    const detail = await findPostDetail(getDb(), null, post.postId);
    expect(detail.status === 'ok' && detail.post.body.text).toBe('$ASELS için @eski_uye ne der?');
    expect(detail.status === 'ok' && detail.post.body.entities).toContainEqual(
      expect.objectContaining({ type: 'mention', username: mentioned.username })
    );
  });
});
