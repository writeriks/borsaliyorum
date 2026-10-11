import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionUser } from '@/lib/auth/types';
import { getDb } from '@/lib/db';
import { type Cursor, decodeCursor, encodeCursor } from '@/lib/db/cursor';

import {
  blockUser,
  createComment,
  createPost,
  createStock,
  createUser,
} from '../../../../tests/factories';

let currentUser: SessionUser | null = null;
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => currentUser }));

const { getCommentsPage, isPostVisible, listCommentsPage } = await import('./queries');

const asViewer = (userId: number, roles: SessionUser['roles'] = ['default']): SessionUser => ({
  userId,
  username: `viewer_${userId}`,
  displayName: 'Görüntüleyen',
  avatarUrl: null,
  email: `viewer${userId}@example.test`,
  emailVerified: true,
  legalAcceptanceRequired: false,
  roles,
});

const likeComment = (userId: number, commentId: number) =>
  getDb().commentLike.create({ data: { userId, commentId } });

beforeEach(() => {
  currentUser = null;
});

describe('listCommentsPage', () => {
  it('eskiden yeniye; aynı createdAt’te commentId ile; imleç sınırında tekrar/atlama yok', async () => {
    const post = await createPost();
    const same = new Date('2026-10-01T10:00:00.000Z');
    const created = [];
    // 5 yorum, üçü aynı anda: keyset ikinci anahtarı (commentId) devreye girmeli
    for (const createdAt of [
      new Date('2026-10-01T09:00:00.000Z'),
      same,
      same,
      same,
      new Date('2026-10-01T11:00:00.000Z'),
    ]) {
      created.push(await createComment({ postId: post.postId, createdAt }));
    }
    const ids = created.map(comment => comment.commentId);

    const seen: number[] = [];
    let cursor: Cursor | null = null;
    let pages = 0;
    do {
      const page = await listCommentsPage(getDb(), null, post.postId, cursor, 2);
      seen.push(...page.items.map(item => item.id));
      // Dışarı verilen opak imleç geri çözülerek kullanılır (istemcinin yaptığı gibi)
      const decoded = page.nextCursor === null ? null : decodeCursor(page.nextCursor);
      cursor = decoded?.ok ? decoded.data : null;
      pages += 1;
    } while (cursor !== null && pages < 10);

    expect(seen).toEqual(ids);
    expect(pages).toBe(3);
  });

  it('son sayfada nextCursor null; tam dolu son sayfada da (fazladan boş sayfa yok)', async () => {
    const post = await createPost();
    await createComment({ postId: post.postId });
    await createComment({ postId: post.postId });
    const page = await listCommentsPage(getDb(), null, post.postId, null, 2);
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it('silinmiş (sahibi ya da moderasyon) yorumlar ve etkin olmayan yazarların yorumları gelmez', async () => {
    const post = await createPost();
    const visible = await createComment({ postId: post.postId });
    await createComment({ postId: post.postId, deletedAt: new Date() });
    await createComment({
      postId: post.postId,
      deletedAt: new Date(),
      removedByModeration: true,
    });
    const suspended = await createUser({ status: 'suspended' });
    await createComment({ postId: post.postId, userId: suspended.userId });
    const page = await listCommentsPage(getDb(), null, post.postId, null);
    expect(page.items.map(item => item.id)).toEqual([visible.commentId]);
  });

  it('görüntüleyenle iki yönlü engelli yazarların yorumları gizlenir; anonim hepsini görür', async () => {
    const post = await createPost();
    const viewer = await createUser();
    const blockedByViewer = await createUser();
    const blockerOfViewer = await createUser();
    const neutral = await createUser();
    await blockUser(viewer.userId, blockedByViewer.userId);
    await blockUser(blockerOfViewer.userId, viewer.userId);
    const a = await createComment({ postId: post.postId, userId: blockedByViewer.userId });
    const b = await createComment({ postId: post.postId, userId: blockerOfViewer.userId });
    const c = await createComment({ postId: post.postId, userId: neutral.userId });

    const asViewerPage = await listCommentsPage(
      getDb(),
      { userId: viewer.userId, canModerate: false },
      post.postId,
      null
    );
    expect(asViewerPage.items.map(item => item.id)).toEqual([c.commentId]);

    const anonymous = await listCommentsPage(getDb(), null, post.postId, null);
    expect(anonymous.items.map(item => item.id)).toEqual([a.commentId, b.commentId, c.commentId]);
  });

  it('DTO: e-posta/uid yok; beğeni, sahiplik ve silme yetkisi görüntüleyene göre', async () => {
    const post = await createPost();
    const author = await createUser({ displayName: 'Yorum Yazarı' });
    const viewer = await createUser();
    const own = await createComment({ postId: post.postId, userId: viewer.userId });
    const other = await createComment({ postId: post.postId, userId: author.userId });
    await likeComment(viewer.userId, other.commentId);
    await likeComment(author.userId, other.commentId);

    const page = await listCommentsPage(
      getDb(),
      { userId: viewer.userId, canModerate: false },
      post.postId,
      null
    );
    expect(page.items).toEqual([
      expect.objectContaining({
        id: own.commentId,
        likes: 0,
        viewer: { liked: false, isOwner: true, canDelete: true },
      }),
      expect.objectContaining({
        id: other.commentId,
        postId: post.postId,
        author: { username: author.username, displayName: 'Yorum Yazarı', avatarUrl: null },
        likes: 2,
        viewer: { liked: true, isOwner: false, canDelete: false },
      }),
    ]);
    const json = JSON.stringify(page);
    expect(json).not.toContain(author.email);
    expect(json).not.toContain(author.firebaseUserId);

    const asModerator = await listCommentsPage(
      getDb(),
      { userId: viewer.userId, canModerate: true },
      post.postId,
      null
    );
    expect(asModerator.items[1]?.viewer).toEqual({ liked: true, isOwner: false, canDelete: true });

    const anonymous = await listCommentsPage(getDb(), null, post.postId, null);
    expect(anonymous.items[1]).not.toHaveProperty('viewer');
    expect(anonymous.items[1]?.likes).toBe(2);
  });

  it('v2 cashtag/mention ve eski format ($(X), @(kullanıcı)) gövdeleri çözülür', async () => {
    const stock = await createStock({ ticker: 'THYAO', companyName: 'Türk Hava Yolları A.O.' });
    const mentioned = await createUser({ username: 'anilan', displayName: 'Anılan Kişi' });
    const legacyMentioned = await createUser({
      username: 'Eski_Ad',
      displayName: 'Eski Kullanıcı',
    });
    const post = await createPost();
    await createComment({
      postId: post.postId,
      content: '$THYAO @anilan',
      contentFormat: 2,
      entities: {
        v: 1,
        items: [
          { type: 'cashtag', start: 0, end: 6, ticker: 'THYAO', stockId: stock.stockId },
          { type: 'mention', start: 7, end: 14, username: 'anilan', userId: mentioned.userId },
        ],
      },
    });
    await createComment({
      postId: post.postId,
      content: 'eski $(THYAO) ve @(eski_ad)',
      contentFormat: 1,
    });

    const page = await listCommentsPage(getDb(), null, post.postId, null);
    const [modern, legacy] = page.items;
    expect(modern?.stocks).toEqual({
      THYAO: { ticker: 'THYAO', companyName: 'Türk Hava Yolları A.O.', stockType: 'stock' },
    });
    expect(modern?.body.entities).toContainEqual(
      expect.objectContaining({ type: 'mention', username: 'anilan', displayName: 'Anılan Kişi' })
    );
    expect(legacy?.body.text).toBe('eski $THYAO ve @eski_ad');
    expect(legacy?.stocks.THYAO?.ticker).toBe('THYAO');
    expect(legacy?.body.entities).toContainEqual(
      expect.objectContaining({
        type: 'mention',
        username: legacyMentioned.username,
        displayName: 'Eski Kullanıcı',
      })
    );
  });
});

describe('isPostVisible', () => {
  it('silinmiş, yazarı etkin olmayan ve iki yönlü engelli gönderi görünmez', async () => {
    const viewer = await createUser();
    const visible = await createPost();
    const deleted = await createPost({ deletedAt: new Date() });
    const suspendedAuthor = await createUser({ status: 'suspended' });
    const ofSuspended = await createPost({ userId: suspendedAuthor.userId });
    const blocker = await createUser();
    await blockUser(blocker.userId, viewer.userId);
    const ofBlocker = await createPost({ userId: blocker.userId });

    const db = getDb();
    expect(await isPostVisible(db, viewer.userId, visible.postId)).toBe(true);
    expect(await isPostVisible(db, viewer.userId, deleted.postId)).toBe(false);
    expect(await isPostVisible(db, viewer.userId, ofSuspended.postId)).toBe(false);
    expect(await isPostVisible(db, viewer.userId, ofBlocker.postId)).toBe(false);
    expect(await isPostVisible(db, null, ofBlocker.postId)).toBe(true);
  });
});

describe('getCommentsPage (DAL)', () => {
  it('anonim okuyabilir', async () => {
    const post = await createPost();
    const comment = await createComment({ postId: post.postId });
    const result = await getCommentsPage(post.postId, null);
    expect(result).toEqual({
      ok: true,
      data: { items: [expect.objectContaining({ id: comment.commentId })], nextCursor: null },
    });
  });

  it('silinmiş, olmayan ve engelli gönderide NOT_FOUND', async () => {
    const viewer = await createUser();
    const deleted = await createPost({ deletedAt: new Date() });
    const blocked = await createUser();
    await blockUser(viewer.userId, blocked.userId);
    const ofBlocked = await createPost({ userId: blocked.userId });
    currentUser = asViewer(viewer.userId);

    expect(await getCommentsPage(deleted.postId, null)).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await getCommentsPage(2_000_000_000, null)).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await getCommentsPage(ofBlocked.postId, null)).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
  });

  it('bozuk imleç ilk sayfaya düşmez: VALIDATION', async () => {
    const post = await createPost();
    expect(await getCommentsPage(post.postId, 'bozuk!')).toEqual({
      ok: false,
      error: 'VALIDATION',
    });
    const valid = encodeCursor({ createdAt: new Date('2026-10-01T00:00:00.000Z'), id: 1 });
    expect((await getCommentsPage(post.postId, valid)).ok).toBe(true);
  });

  it('oturumdaki moderatör rolü silme menüsünü açar (UI); yetki action’da DB’den', async () => {
    const post = await createPost();
    await createComment({ postId: post.postId });
    const moderator = await createUser();
    currentUser = asViewer(moderator.userId, ['moderator']);
    const result = await getCommentsPage(post.postId, null);
    expect(result.ok && result.data.items[0]?.viewer?.canDelete).toBe(true);
  });
});
