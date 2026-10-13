import { randomBytes, randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '@/generated/prisma/client';
import type { SessionState } from '@/lib/auth/types';
import { resolveWriter } from '@/lib/auth/writer';
import { WRITER_GATES } from '@/lib/auth/writer-gates';
import { CONTENT_MAX_CHARS } from '@/lib/content-limits';
import { decryptIp } from '@/lib/crypto';
import { getDb } from '@/lib/db';
import { LEGAL_BUNDLE_VERSION, needsLegalAcceptance } from '@/lib/legal/versions';
import type { Logger } from '@/lib/logger';

import {
  blockUser,
  createComment as createCommentRow,
  createPost,
  createStock,
  createUser,
} from '../../../../tests/factories';

const IP_KEY = new Uint8Array(randomBytes(32));
const CLIENT_IP = '2001:db8::17';

let session: SessionState = { status: 'anonymous' };
vi.mock('@/lib/auth/session', () => ({
  requireWriter: () =>
    resolveWriter(session, {
      fetchEmailVerified: async () => false,
      markEmailVerified: async () => undefined,
      log: silentLog,
      gates: WRITER_GATES,
    }),
}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': `${CLIENT_IP}, 10.0.0.1` }),
}));
const updateTag = vi.fn();
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  updateTag: (...args: unknown[]) => updateTag(...args),
}));
vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('@/lib/crypto/key', () => ({ getIpEncryptionKey: () => IP_KEY }));

const silentLog: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: () => silentLog,
};

const { createComment, deleteComment, setCommentLike } = await import('./actions');

const signIn = (user: User): void => {
  session = {
    status: 'authenticated',
    firebaseUid: user.firebaseUserId,
    authTime: 0,
    user: {
      userId: user.userId,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: null,
      email: user.email,
      emailVerified: user.isEmailVerified,
      legalAcceptanceRequired: needsLegalAcceptance(user.legalBundleVersion),
      roles: [],
    },
  };
};

const writer = async (overrides: Parameters<typeof createUser>[0] = {}): Promise<User> => {
  const user = await createUser(overrides);
  signIn(user);
  return user;
};

const input = (postId: number, text: string, clientRequestId: string = randomUUID()) => ({
  postId,
  text,
  clientRequestId,
});

beforeEach(() => {
  session = { status: 'anonymous' };
  updateTag.mockReset();
});

describe('createComment', () => {
  it('anonim → UNAUTHENTICATED; doğrulanmamış → EMAIL_NOT_VERIFIED', async () => {
    const post = await createPost();
    expect(await createComment(input(post.postId, 'selam'))).toEqual({
      ok: false,
      error: 'UNAUTHENTICATED',
    });
    await writer({ isEmailVerified: false });
    expect(await createComment(input(post.postId, 'selam'))).toEqual({
      ok: false,
      error: 'EMAIL_NOT_VERIFIED',
    });
  });

  it('eski yasal paketi kabul etmiş → yorum ve yorum beğenisi LEGAL_ACCEPTANCE_REQUIRED, satır yok; kabulden sonra yazılır', async () => {
    const post = await createPost();
    const comment = await createCommentRow({ postId: post.postId });
    const user = await writer({ legalBundleVersion: null });
    const gated = { ok: false, error: 'LEGAL_ACCEPTANCE_REQUIRED' };
    expect(await createComment(input(post.postId, 'kabul etmeden'))).toEqual(gated);
    expect(await setCommentLike({ commentId: comment.commentId, liked: true })).toEqual(gated);
    expect(await getDb().comment.count({ where: { userId: user.userId } })).toBe(0);

    signIn(
      await getDb().user.update({
        where: { userId: user.userId },
        data: { legalBundleVersion: LEGAL_BUNDLE_VERSION },
      })
    );
    expect((await createComment(input(post.postId, 'kabul ettim'))).ok).toBe(true);
  });

  it('yorumda tanınmış cashtag kabul edilir (eski hata #6 regresyonu) ve entities çözülür', async () => {
    const stock = await createStock({ ticker: 'EREGL' });
    const post = await createPost();
    const user = await writer();
    const result = await createComment(input(post.postId, '$EREGL için katılıyorum #celik'));
    expect(result.ok).toBe(true);
    const comment = await getDb().comment.findUniqueOrThrow({
      where: { commentId: result.ok ? result.data.commentId : -1 },
    });
    expect(comment).toMatchObject({
      postId: post.postId,
      userId: user.userId,
      contentFormat: 2,
      content: '$EREGL için katılıyorum #celik',
    });
    // Yorumda etiket ilişkisi yok (M1): hashtag entity'ye girmez, düz metin
    expect(comment.entities).toEqual({
      v: 1,
      items: [{ type: 'cashtag', start: 0, end: 6, ticker: 'EREGL', stockId: stock.stockId }],
    });
  });

  it('bilinmeyen cashtag → UNKNOWN_CASHTAG + meta.tickers', async () => {
    const post = await createPost();
    await writer();
    expect(await createComment(input(post.postId, '$BILINMZ ne olacak'))).toEqual({
      ok: false,
      error: 'UNKNOWN_CASHTAG',
      meta: { tickers: ['BILINMZ'] },
    });
  });

  it('sınır 500 grafem (K11): 500 kabul, 501 → CONTENT_TOO_LONG', async () => {
    const post = await createPost();
    await writer();
    expect(
      (await createComment(input(post.postId, 'ş'.repeat(CONTENT_MAX_CHARS.comment)))).ok
    ).toBe(true);
    expect(
      await createComment(input(post.postId, '🇹🇷'.repeat(CONTENT_MAX_CHARS.comment + 1)))
    ).toEqual({ ok: false, error: 'CONTENT_TOO_LONG', meta: { max: 500 } });
  });

  it('ham code unit sınırı (2000) parse öncesi: 300 aile emojisi (2400 code unit) → CONTENT_TOO_LONG', async () => {
    const post = await createPost();
    await writer();
    expect(await createComment(input(post.postId, '👨\u200D👩\u200D👧'.repeat(300)))).toEqual({
      ok: false,
      error: 'CONTENT_TOO_LONG',
      meta: { max: 500 },
    });
  });

  it('gönderi yazarıyla iki yönlü engel ya da yazar etkin değil → FORBIDDEN (K-C), satır yok', async () => {
    const author = await createUser();
    const post = await createPost({ userId: author.userId });
    const commenter = await writer();
    await blockUser(author.userId, commenter.userId);
    expect(await createComment(input(post.postId, 'engellendim'))).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });

    const blockedByMe = await createUser();
    const post2 = await createPost({ userId: blockedByMe.userId });
    await blockUser(commenter.userId, blockedByMe.userId);
    expect(await createComment(input(post2.postId, 'ben engelledim'))).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });

    for (const status of ['suspended', 'deleted'] as const) {
      const inactive = await createUser({ status });
      const post3 = await createPost({ userId: inactive.userId });
      expect(await createComment(input(post3.postId, `yazar ${status}`))).toEqual({
        ok: false,
        error: 'FORBIDDEN',
      });
    }
    expect(await getDb().comment.count({ where: { userId: commenter.userId } })).toBe(0);

    // Kendi gönderisine yorum her zaman serbest
    const ownPost = await createPost({ userId: commenter.userId });
    expect((await createComment(input(ownPost.postId, 'kendi gönderim'))).ok).toBe(true);
    expect(updateTag).toHaveBeenCalledWith(`post:${ownPost.postId}:comments`);
  });

  it('mention bildirimi tavanı: aynı yazar → aynı alıcı günde 20 (21. yorum bildirimsiz)', async () => {
    const target = await createUser({ username: 'yorum_tavan' });
    const post = await createPost();
    const author = await writer();
    for (let i = 0; i < 21; i += 1) {
      expect((await createComment(input(post.postId, `@yorum_tavan bak ${i}`))).ok).toBe(true);
    }
    expect(
      await getDb().notification.count({
        where: { userId: target.userId, fromUserId: author.userId, type: 'MENTION' },
      })
    ).toBe(20);
    // Başka yazar aynı alıcıyı hâlâ anabilir
    const other = await writer();
    expect((await createComment(input(post.postId, '@yorum_tavan selam'))).ok).toBe(true);
    expect(
      await getDb().notification.count({
        where: { userId: target.userId, fromUserId: other.userId },
      })
    ).toBe(1);
  });

  it('silinmiş/olmayan gönderiye yorum → NOT_FOUND', async () => {
    const deleted = await createPost({ deletedAt: new Date() });
    await writer();
    expect(await createComment(input(deleted.postId, 'geç kaldım'))).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    expect(await createComment(input(2_000_000_000, 'yok'))).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
  });

  it('idempotency: aynı kimlik aynı yük → ilk commentId; farklı metin ya da gönderi → CONFLICT', async () => {
    const post = await createPost();
    const other = await createPost();
    const user = await writer();
    const id = randomUUID();
    const first = await createComment(input(post.postId, 'ilk', id));
    expect(await createComment(input(post.postId, 'ilk', id))).toEqual(first);
    expect(await createComment(input(post.postId, 'değişti', id))).toEqual({
      ok: false,
      error: 'CONFLICT',
    });
    expect(await createComment(input(other.postId, 'ilk', id))).toEqual({
      ok: false,
      error: 'CONFLICT',
    });
    expect(await getDb().comment.count({ where: { userId: user.userId } })).toBe(1);
  });

  it("başka kullanıcının clientRequestId'si çakışmaz", async () => {
    const post = await createPost();
    const id = randomUUID();
    await writer();
    const a = await createComment(input(post.postId, 'a', id));
    const bob = await writer();
    const b = await createComment(input(post.postId, 'b', id));
    expect(a.ok && b.ok).toBe(true);
    expect(b).not.toEqual(a);
    const bobComment = await getDb().comment.findUniqueOrThrow({
      where: { commentId: b.ok ? b.data.commentId : -1 },
    });
    expect(bobComment).toMatchObject({ userId: bob.userId, content: 'b' });
  });

  it('ContentEvent comment.create (IP x-forwarded-for ilk adresi, şifreli) ve mention bildirimi', async () => {
    const post = await createPost();
    const friend = await createUser({ username: 'yorum_dostu' });
    const blocker = await createUser({ username: 'yorum_engel' });
    const user = await writer();
    await blockUser(blocker.userId, user.userId);
    const result = await createComment(input(post.postId, '@yorum_dostu @yorum_engel bak'));
    const commentId = result.ok ? result.data.commentId : -1;
    const events = await getDb().contentEvent.findMany({ where: { actorUserId: user.userId } });
    expect(events).toEqual([
      expect.objectContaining({
        action: 'comment_create',
        entityType: 'comment',
        entityId: commentId,
      }),
    ]);
    expect(decryptIp(events[0]?.ipEncrypted ?? new Uint8Array(), IP_KEY)).toBe(CLIENT_IP);
    expect(await getDb().notification.findMany({ where: { commentId } })).toEqual([
      expect.objectContaining({ userId: friend.userId, type: 'MENTION', postId: post.postId }),
    ]);
  });
});

describe('deleteComment', () => {
  it('sahibi siler (soft) + tek comment.delete olayı; başkası → FORBIDDEN', async () => {
    const owner = await writer();
    const post = await createPost();
    const created = await createComment(input(post.postId, 'silinecek yorum'));
    const commentId = created.ok ? created.data.commentId : -1;

    const attacker = await writer();
    expect(await deleteComment({ commentId })).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect(await getDb().contentEvent.count({ where: { actorUserId: attacker.userId } })).toBe(0);

    signIn(owner);
    expect(await deleteComment({ commentId })).toEqual({ ok: true, data: null });
    expect(await deleteComment({ commentId })).toEqual({ ok: true, data: null });
    const row = await getDb().comment.findUniqueOrThrow({ where: { commentId } });
    expect(row.deletedAt).toBeInstanceOf(Date);
    expect(
      await getDb().contentEvent.count({
        where: { actorUserId: owner.userId, action: 'comment_delete', entityId: commentId },
      })
    ).toBe(1);
  });

  it("moderatör/admin (rol DB'de) başkasının yorumunu kaldırır: moderation.remove + removedByModeration", async () => {
    const comment = await createCommentRow();
    const moderator = await writer();
    expect(await deleteComment({ commentId: comment.commentId })).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    await getDb().securityRole.create({ data: { userId: moderator.userId, role: 'moderator' } });
    expect(await deleteComment({ commentId: comment.commentId })).toEqual({ ok: true, data: null });
    const row = await getDb().comment.findUniqueOrThrow({
      where: { commentId: comment.commentId },
    });
    expect(row.deletedAt).toBeInstanceOf(Date);
    expect(row.removedByModeration).toBe(true);
    expect(
      await getDb().contentEvent.findMany({ where: { actorUserId: moderator.userId } })
    ).toEqual([
      expect.objectContaining({
        action: 'moderation_remove',
        entityType: 'comment',
        entityId: comment.commentId,
      }),
    ]);
    expect(updateTag).toHaveBeenCalledWith(`post:${comment.postId}:comments`);
  });

  it('olmayan yorum → NOT_FOUND', async () => {
    await writer();
    expect(await deleteComment({ commentId: 2_000_000_000 })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
  });
});

describe('setCommentLike', () => {
  it('idempotent ve yarışta tek satır; silinmiş yorum → NOT_FOUND', async () => {
    const comment = await createCommentRow();
    const user = await writer();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => setCommentLike({ commentId: comment.commentId, liked: true }))
    );
    expect(results.every(r => r.ok)).toBe(true);
    expect(await getDb().commentLike.count({ where: { userId: user.userId } })).toBe(1);
    expect(await setCommentLike({ commentId: comment.commentId, liked: false })).toEqual({
      ok: true,
      data: { liked: false },
    });
    expect(await getDb().commentLike.count({ where: { userId: user.userId } })).toBe(0);

    // Beğeni de yorum ve gönderi önbelleğini senkron geçersiz kılar (setPostLike ile tutarlı)
    expect(updateTag).toHaveBeenCalledWith(`post:${comment.postId}:comments`);
    expect(updateTag).toHaveBeenCalledWith(`post:${comment.postId}`);

    const removed = await createCommentRow({ deletedAt: new Date() });
    expect(await setCommentLike({ commentId: removed.commentId, liked: true })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
  });
});

describe('setCommentLike: etkileşim kapısı (K-C)', () => {
  it('yorum ya da gönderi yazarıyla iki yönlü engel / etkin olmayan yazar → FORBIDDEN; geri almak serbest', async () => {
    const postAuthor = await createUser();
    const commentAuthor = await createUser();
    const post = await createPost({ userId: postAuthor.userId });
    const comment = await createCommentRow({ postId: post.postId, userId: commentAuthor.userId });
    const liker = await writer();
    expect((await setCommentLike({ commentId: comment.commentId, liked: true })).ok).toBe(true);

    await blockUser(commentAuthor.userId, liker.userId);
    expect(await setCommentLike({ commentId: comment.commentId, liked: true })).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect((await setCommentLike({ commentId: comment.commentId, liked: false })).ok).toBe(true);

    const comment2 = await createCommentRow({ postId: post.postId });
    await blockUser(liker.userId, postAuthor.userId);
    expect(await setCommentLike({ commentId: comment2.commentId, liked: true })).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });

    const suspended = await createUser({ status: 'suspended' });
    const comment3 = await createCommentRow({ userId: suspended.userId });
    expect(await setCommentLike({ commentId: comment3.commentId, liked: true })).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect(await getDb().commentLike.count({ where: { userId: liker.userId } })).toBe(0);
  });
});
