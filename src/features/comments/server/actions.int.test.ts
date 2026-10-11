import { randomBytes, randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '@/generated/prisma/client';
import type { SessionState } from '@/lib/auth/types';
import { resolveWriter } from '@/lib/auth/writer';
import { CONTENT_MAX_CHARS } from '@/lib/content-limits';
import { decryptIp } from '@/lib/crypto';
import { getDb } from '@/lib/db';
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
    }),
}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': `${CLIENT_IP}, 10.0.0.1` }),
}));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
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

    const removed = await createCommentRow({ deletedAt: new Date() });
    expect(await setCommentLike({ commentId: removed.commentId, liked: true })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
  });
});
