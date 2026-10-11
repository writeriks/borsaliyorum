import { randomBytes, randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '@/generated/prisma/client';
import type { SessionState } from '@/lib/auth/types';
import { resolveWriter } from '@/lib/auth/writer';
import { CONTENT_MAX_CHARS } from '@/lib/content-limits';
import { decryptIp } from '@/lib/crypto';
import { getDb } from '@/lib/db';
import { normalizePreviewUrl } from '@/lib/link-preview/normalize-url';
import { previewUrlHash } from '@/lib/link-preview/url-hash';
import type { Logger } from '@/lib/logger';

import {
  blockUser,
  createPost as createPostRow,
  createStock,
  createTag,
  createUser,
} from '../../../../tests/factories';

import { attachPreviewToPost } from './attach-preview';

const IP_KEY = new Uint8Array(randomBytes(32));
const CLIENT_IP = '198.51.100.42';

// --- Server Action sınırları (ADR-0003): oturum çerezi, next/headers, next/cache, after mock'lanır.
// Yazma kapısı gerçek `resolveWriter`: oturum durumu ve Firebase tazelemesi test başına seçilir.
let session: SessionState = { status: 'anonymous' };
let firebaseVerified = false;
vi.mock('@/lib/auth/session', () => ({
  requireWriter: () =>
    resolveWriter(session, {
      fetchEmailVerified: async () => firebaseVerified,
      markEmailVerified: async userId => {
        await getDb().user.update({ where: { userId }, data: { isEmailVerified: true } });
      },
      log: silentLog,
    }),
}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-real-ip': CLIENT_IP, 'x-request-id': 'req-s10' }),
}));
const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }));
const afterTasks: (() => unknown)[] = [];
vi.mock('next/server', () => ({ after: (task: () => unknown) => afterTasks.push(task) }));
vi.mock('@/lib/crypto/key', () => ({ getIpEncryptionKey: () => IP_KEY }));

const silentLog: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: () => silentLog,
};

const { createPost, deletePost, setPostLike } = await import('./actions');

const signIn = (user: User, overrides: { roles?: ('moderator' | 'admin')[] } = {}): void => {
  session = {
    status: 'authenticated',
    firebaseUid: user.firebaseUserId,
    authTime: Math.floor(Date.now() / 1000),
    user: {
      userId: user.userId,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: null,
      email: user.email,
      emailVerified: user.isEmailVerified,
      roles: overrides.roles ?? [],
    },
  };
};

const writer = async (overrides: Parameters<typeof createUser>[0] = {}): Promise<User> => {
  const user = await createUser(overrides);
  signIn(user);
  return user;
};

const input = (text: string, overrides: Record<string, unknown> = {}) => ({
  text,
  sentiment: 'neutral',
  isSponsored: false,
  previewUrl: null,
  clientRequestId: randomUUID(),
  ...overrides,
});

const runAfterTasks = async (): Promise<void> => {
  for (const task of afterTasks.splice(0)) await task();
};

beforeEach(() => {
  session = { status: 'anonymous' };
  firebaseVerified = false;
  afterTasks.length = 0;
  revalidateTag.mockReset();
});

describe('createPost: yazma kapısı (requireWriter)', () => {
  it('anonim → UNAUTHENTICATED, satır yok', async () => {
    const before = await getDb().post.count();
    expect(await createPost(input('merhaba'))).toEqual({ ok: false, error: 'UNAUTHENTICATED' });
    expect(await getDb().post.count()).toBe(before);
  });

  it('onboarding eksik → ONBOARDING_REQUIRED', async () => {
    session = {
      status: 'needs-onboarding',
      authTime: 0,
      identity: {
        firebaseUid: 'x',
        email: 'x@example.test',
        emailVerified: true,
        suggestedDisplayName: null,
        existingUserId: null,
      },
    };
    expect(await createPost(input('merhaba'))).toEqual({
      ok: false,
      error: 'ONBOARDING_REQUIRED',
    });
  });

  it('e-postası doğrulanmamış (Firebase de doğrulanmamış diyor) → EMAIL_NOT_VERIFIED, satır yok', async () => {
    const user = await writer({ isEmailVerified: false });
    expect(await createPost(input('doğrulanmadan yazıyorum'))).toEqual({
      ok: false,
      error: 'EMAIL_NOT_VERIFIED',
    });
    expect(await getDb().post.count({ where: { userId: user.userId } })).toBe(0);
  });

  it("Firebase'de doğrulanmışsa DB güncellenir ve gönderi yazılır", async () => {
    const user = await writer({ isEmailVerified: false });
    firebaseVerified = true;
    const result = await createPost(input('artık doğrulandım'));
    expect(result.ok).toBe(true);
    expect(
      (await getDb().user.findUniqueOrThrow({ where: { userId: user.userId } })).isEmailVerified
    ).toBe(true);
  });

  it('geçersiz girdi → VALIDATION (clientRequestId uuid değil, fazladan alan)', async () => {
    await writer();
    expect(await createPost(input('x', { clientRequestId: 'abc' }))).toEqual({
      ok: false,
      error: 'VALIDATION',
    });
    expect(await createPost({ ...input('x'), entities: [] })).toEqual({
      ok: false,
      error: 'VALIDATION',
    });
  });
});

describe('createPost: içerik ve entity çözümü', () => {
  it('cashtag + hashtag + mention + link: Post, _PostStocks, _PostTags, entities tutarlı; contentFormat 2', async () => {
    const thyao = await createStock({ ticker: 'THYAO' });
    const mentioned = await createUser({ username: 'mehmet_s10' });
    const author = await writer();
    const text = "$THYAO'da #bist100 kırılımı @mehmet_s10 https://kap.org.tr/tr/Bildirim/1";
    const result = await createPost(input(text, { sentiment: 'bullish' }));
    expect(result.ok).toBe(true);
    const postId = result.ok ? result.data.postId : -1;

    const post = await getDb().post.findUniqueOrThrow({
      where: { postId },
      include: { stocks: true, tags: { include: { tag: true } } },
    });
    expect(post).toMatchObject({
      userId: author.userId,
      content: text,
      contentFormat: 2,
      sentiment: 'bullish',
      isSponsored: false,
    });
    expect(post.stocks.map(s => s.stockId)).toEqual([thyao.stockId]);
    expect(post.tags.map(t => t.tag.slug)).toEqual(['bist100']);
    const tagId = post.tags[0]?.tagId;
    const at = (token: string) => {
      const start = text.indexOf(token);
      return { start, end: start + token.length };
    };
    const url = 'https://kap.org.tr/tr/Bildirim/1';
    expect(post.entities).toEqual({
      v: 1,
      items: [
        { type: 'cashtag', ...at('$THYAO'), ticker: 'THYAO', stockId: thyao.stockId },
        { type: 'hashtag', ...at('#bist100'), slug: 'bist100', tagId },
        { type: 'mention', ...at('@mehmet_s10'), username: 'mehmet_s10', userId: mentioned.userId },
        { type: 'url', ...at(url), href: url },
      ],
    });
  });

  it('istemci metni normalize edilir (CRLF, sıfır genişlikli boşluk, bidi) ve sunucu kendi parse eder', async () => {
    const stock = await createStock({ ticker: 'ASELS' });
    await writer();
    const result = await createPost(input('  $AS​ELS\r\nyükselir‮  '));
    expect(result.ok).toBe(true);
    const post = await getDb().post.findUniqueOrThrow({
      where: { postId: result.ok ? result.data.postId : -1 },
      include: { stocks: true },
    });
    expect(post.content).toBe('$ASELS\nyükselir');
    expect(post.stocks.map(s => s.stockId)).toEqual([stock.stockId]);
  });

  it("cashtagsiz gönderi kabul edilir ve sentiment neutral'a zorlanır (K4)", async () => {
    await writer();
    const result = await createPost(input('genel piyasa yorumu', { sentiment: 'bearish' }));
    expect(result.ok).toBe(true);
    const post = await getDb().post.findUniqueOrThrow({
      where: { postId: result.ok ? result.data.postId : -1 },
    });
    expect(post.sentiment).toBe('neutral');
  });

  it('bilinmeyen cashtag → UNKNOWN_CASHTAG + hangi kodlar (meta.tickers), satır yok (K5)', async () => {
    await createStock({ ticker: 'SISE' });
    const user = await writer();
    expect(await createPost(input('$SISE $YOKBU1 ve $YOKBU2 $yokbu1'))).toEqual({
      ok: false,
      error: 'UNKNOWN_CASHTAG',
      meta: { tickers: ['YOKBU1', 'YOKBU2'] },
    });
    expect(await getDb().post.count({ where: { userId: user.userId } })).toBe(0);
  });

  it('sponsorlu + tanınmış cashtag → SPONSORED_CASHTAG_BLOCKED; cashtagsiz sponsorlu kabul', async () => {
    await createStock({ ticker: 'KCHOL' });
    await writer();
    expect(await createPost(input('$KCHOL harika', { isSponsored: true }))).toEqual({
      ok: false,
      error: 'SPONSORED_CASHTAG_BLOCKED',
    });
    const okResult = await createPost(input('kampanyamız başladı', { isSponsored: true }));
    expect(okResult.ok).toBe(true);
    const post = await getDb().post.findUniqueOrThrow({
      where: { postId: okResult.ok ? okResult.data.postId : -1 },
    });
    expect(post.isSponsored).toBe(true);
  });

  it('boş/yalnızca boşluk/görünmez karakter → CONTENT_EMPTY', async () => {
    await writer();
    for (const text of ['', '   \n  ', '​⁦']) {
      expect(await createPost(input(text))).toEqual({ ok: false, error: 'CONTENT_EMPTY' });
    }
  });

  it('sınır grafem bazlı: 1000 aile emojisi (8 code unit) kabul, 1001 → CONTENT_TOO_LONG', async () => {
    await writer();
    const family = '👨‍👩‍👧';
    expect(family.length).toBe(8);
    expect((await createPost(input(family.repeat(CONTENT_MAX_CHARS.post)))).ok).toBe(true);
    expect(await createPost(input(family.repeat(CONTENT_MAX_CHARS.post + 1)))).toEqual({
      ok: false,
      error: 'CONTENT_TOO_LONG',
      meta: { max: 1000 },
    });
    expect((await createPost(input('ğ'.repeat(1000)))).ok).toBe(true);
  });

  it('11 tekil mention → TOO_MANY_ENTITIES; aynı kişiyi 11 kez anmak sınırı aşmaz', async () => {
    await writer();
    const eleven = Array.from({ length: 11 }, (_, i) => `@kisi_${i}`).join(' ');
    expect(await createPost(input(eleven))).toEqual({
      ok: false,
      error: 'TOO_MANY_ENTITIES',
      meta: { max: 10 },
    });
    expect((await createPost(input(Array(11).fill('@ayni_kisi').join(' ')))).ok).toBe(true);
  });

  it('Tag slug birleşimi: #İHRACAT / #ihracat / #IHRACAT tek etiket; görünen ad ilk biçim', async () => {
    await writer();
    const ids: number[] = [];
    for (const text of ['#İHRACAT açılış', '#ihracat kapanış', '#IHRACAT rekor']) {
      const result = await createPost(input(text));
      expect(result.ok).toBe(true);
      ids.push(result.ok ? result.data.postId : -1);
    }
    const tags = await getDb().tag.findMany({ where: { slug: 'ihracat' } });
    expect(tags).toHaveLength(1);
    expect(tags[0]?.tagName).toBe('#İHRACAT');
    const links = await getDb().postTag.findMany({ where: { postId: { in: ids } } });
    expect(new Set(links.map(l => l.tagId))).toEqual(new Set([tags[0]?.tagId]));
  });

  it('mevcut etiket kullanılınca Tag.updatedAt now() olur (son kullanım; S7 öneri sıralaması)', async () => {
    const old = new Date('2026-01-01T00:00:00Z');
    const tag = await createTag({
      tagName: '#sonkullanim',
      slug: 'sonkullanim',
      createdAt: old,
      updatedAt: old,
    });
    const untouched = await createTag({
      tagName: '#dokunulmaz',
      slug: 'dokunulmaz',
      updatedAt: old,
    });
    await writer();
    const before = Date.now();
    expect((await createPost(input('#SonKullanim yine gündemde'))).ok).toBe(true);
    const after = await getDb().tag.findUniqueOrThrow({ where: { tagId: tag.tagId } });
    expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(after.createdAt).toEqual(old);
    expect(after.tagName).toBe('#sonkullanim');
    expect(
      (await getDb().tag.findUniqueOrThrow({ where: { tagId: untouched.tagId } })).updatedAt
    ).toEqual(old);
  });

  it("eski uygulamanın slug'sız etiketi aynı adla kullanılınca slug'ı ona verilir (çift satır yok)", async () => {
    const legacy = await createTag({ tagName: '#temettu2026', slug: null });
    await writer();
    const result = await createPost(input('#temettu2026 dönemi'));
    expect(result.ok).toBe(true);
    const tags = await getDb().tag.findMany({ where: { tagName: '#temettu2026' } });
    expect(tags).toEqual([expect.objectContaining({ tagId: legacy.tagId, slug: 'temettu2026' })]);
  });

  it('mention bildirimi: kendine ve iki yönlü engellemede yok; askıdaki kullanıcı mention olmaz', async () => {
    const friend = await createUser({ username: 'arkadas_s10' });
    const blocker = await createUser({ username: 'engelleyen_s10' });
    const blockedByMe = await createUser({ username: 'engelledigim_s10' });
    await createUser({ username: 'askida_s10', status: 'suspended' });
    const author = await writer({ username: 'yazar_s10' });
    await blockUser(blocker.userId, author.userId);
    await blockUser(author.userId, blockedByMe.userId);

    const result = await createPost(
      input('@yazar_s10 @arkadas_s10 @ARKADAS_s10 @engelleyen_s10 @engelledigim_s10 @askida_s10')
    );
    expect(result.ok).toBe(true);
    const postId = result.ok ? result.data.postId : -1;
    const notifications = await getDb().notification.findMany({ where: { postId } });
    expect(notifications).toEqual([
      expect.objectContaining({
        userId: friend.userId,
        fromUserId: author.userId,
        type: 'MENTION',
        read: false,
      }),
    ]);
    const post = await getDb().post.findUniqueOrThrow({ where: { postId } });
    const mentionIds = (post.entities as { items: { type: string; userId?: number }[] }).items
      .filter(item => item.type === 'mention')
      .map(item => item.userId);
    // Engelleme bildirim içindir, link değil; askıdaki kullanıcı ise hiç çözülmez (düz metin)
    expect(mentionIds).toEqual([
      author.userId,
      friend.userId,
      friend.userId,
      blocker.userId,
      blockedByMe.userId,
    ]);
  });
});

describe('createPost: idempotency (clientRequestId)', () => {
  it('aynı kimlik + aynı yük → ilk postId, tek satır; tek ContentEvent', async () => {
    const user = await writer();
    const request = input('çift tık testi');
    const first = await createPost(request);
    const second = await createPost(request);
    expect(first.ok && second.ok).toBe(true);
    expect(second).toEqual(first);
    expect(await getDb().post.count({ where: { userId: user.userId } })).toBe(1);
    expect(await getDb().contentEvent.count({ where: { actorUserId: user.userId } })).toBe(1);
  });

  it('aynı kimlik + farklı yük (metin ya da sponsorluk) → CONFLICT, yeni satır yok', async () => {
    const user = await writer();
    const request = input('ilk metin');
    expect((await createPost(request)).ok).toBe(true);
    expect(await createPost({ ...request, text: 'başka metin' })).toEqual({
      ok: false,
      error: 'CONFLICT',
    });
    expect(await createPost({ ...request, isSponsored: true })).toEqual({
      ok: false,
      error: 'CONFLICT',
    });
    expect(await getDb().post.count({ where: { userId: user.userId } })).toBe(1);
  });

  it('eşzamanlı aynı kimlik → tek satır, iki yanıt aynı postId', async () => {
    const user = await writer();
    const request = input('yarış');
    const results = await Promise.all([createPost(request), createPost(request)]);
    expect(results.every(r => r.ok)).toBe(true);
    expect(results[0]).toEqual(results[1]);
    expect(await getDb().post.count({ where: { userId: user.userId } })).toBe(1);
  });

  it("başka kullanıcının clientRequestId'si çakışmaz ve onun gönderisini döndürmez", async () => {
    const alice = await writer();
    const request = input('alice yazdı');
    const aliceResult = await createPost(request);
    const bob = await writer();
    const bobResult = await createPost({ ...request, text: 'bob yazdı' });
    expect(aliceResult.ok && bobResult.ok).toBe(true);
    expect(bobResult).not.toEqual(aliceResult);
    const bobPost = await getDb().post.findUniqueOrThrow({
      where: { postId: bobResult.ok ? bobResult.data.postId : -1 },
    });
    expect(bobPost).toMatchObject({ userId: bob.userId, content: 'bob yazdı' });
    expect(await getDb().post.count({ where: { userId: alice.userId } })).toBe(1);
  });
});

describe('createPost: rate limit, 5651 kaydı, önizleme', () => {
  it('10 dakikada 11. gönderi → RATE_LIMITED + retryAfter', async () => {
    await writer();
    for (let i = 0; i < 10; i += 1) expect((await createPost(input(`gönderi ${i}`))).ok).toBe(true);
    const limited = await createPost(input('fazlası'));
    expect(limited).toMatchObject({ ok: false, error: 'RATE_LIMITED' });
    const retryAfter = limited.ok ? 0 : limited.meta?.retryAfter;
    expect(typeof retryAfter === 'number' && retryAfter > 0 && retryAfter <= 600).toBe(true);
  });

  it('her başarılı yazmada tek ContentEvent (post.create, IP şifreli, requestId)', async () => {
    const user = await writer();
    const result = await createPost(input('5651 kaydı'));
    const postId = result.ok ? result.data.postId : -1;
    const events = await getDb().contentEvent.findMany({ where: { actorUserId: user.userId } });
    expect(events).toEqual([
      expect.objectContaining({
        action: 'post_create',
        entityType: 'post',
        entityId: postId,
        requestId: 'req-s10',
      }),
    ]);
    expect(decryptIp(events[0]?.ipEncrypted ?? new Uint8Array(), IP_KEY)).toBe(CLIENT_IP);
  });

  it('önbellekte hazır önizleme hemen bağlanır; metinde olmayan previewUrl yok sayılır', async () => {
    const url = 'https://haber.example.com/thy-yeni-hat';
    const preview = await getDb().linkPreview.create({
      data: {
        urlHash: previewUrlHash(normalizePreviewUrl(url) ?? ''),
        url,
        status: 'ok',
        title: 'THY yeni hat',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await writer();
    const linked = await createPost(input(`haber: ${url}`, { previewUrl: url }));
    const post = await getDb().post.findUniqueOrThrow({
      where: { postId: linked.ok ? linked.data.postId : -1 },
    });
    expect(post.linkPreviewId).toBe(preview.id);

    const foreign = await createPost(input('linksiz metin', { previewUrl: url }));
    const foreignPost = await getDb().post.findUniqueOrThrow({
      where: { postId: foreign.ok ? foreign.data.postId : -1 },
    });
    expect(foreignPost.linkPreviewId).toBeNull();

    const dismissed = await createPost(input(`kartı kapattım ${url}`, { previewUrl: null }));
    const dismissedPost = await getDb().post.findUniqueOrThrow({
      where: { postId: dismissed.ok ? dismissed.data.postId : -1 },
    });
    expect(dismissedPost.linkPreviewId).toBeNull();

    await runAfterTasks();
    expect(revalidateTag).toHaveBeenCalledWith('feed', 'max');
  });

  it('after(): önbellekteki önizleme sonradan gönderiye bağlanır (attachPreviewToPost)', async () => {
    const user = await writer();
    const url = 'https://haber.example.com/sonradan';
    const postRow = await createPostRow({ userId: user.userId, content: url });
    const preview = await getDb().linkPreview.create({
      data: {
        urlHash: previewUrlHash(normalizePreviewUrl(url) ?? ''),
        url,
        status: 'ok',
        title: 'Sonradan',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    expect(await attachPreviewToPost(postRow.postId, url, { db: getDb(), log: silentLog })).toBe(
      true
    );
    const post = await getDb().post.findUniqueOrThrow({ where: { postId: postRow.postId } });
    expect(post.linkPreviewId).toBe(preview.id);
  });
});

describe('deletePost', () => {
  it('sahibi siler: soft delete + tek post.delete olayı; ikinci silme başarı, ikinci olay yok', async () => {
    const user = await writer();
    const created = await createPost(input('silinecek'));
    const postId = created.ok ? created.data.postId : -1;
    expect(await deletePost({ postId })).toEqual({ ok: true, data: null });
    expect(await deletePost({ postId })).toEqual({ ok: true, data: null });
    const post = await getDb().post.findUniqueOrThrow({ where: { postId } });
    expect(post.deletedAt).toBeInstanceOf(Date);
    const deletes = await getDb().contentEvent.findMany({
      where: { actorUserId: user.userId, action: 'post_delete' },
    });
    expect(deletes).toEqual([expect.objectContaining({ entityType: 'post', entityId: postId })]);
  });

  it('başkasının gönderisi → FORBIDDEN (IDOR), gönderi silinmez, olay yazılmaz', async () => {
    const owner = await createUser();
    const post = await createPostRow({ userId: owner.userId });
    const attacker = await writer();
    expect(await deletePost({ postId: post.postId })).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect(
      (await getDb().post.findUniqueOrThrow({ where: { postId: post.postId } })).deletedAt
    ).toBeNull();
    expect(await getDb().contentEvent.count({ where: { actorUserId: attacker.userId } })).toBe(0);
  });

  it('moderatör rolü de bu action ile başkasının gönderisini silemez (moderasyon ayrı akış)', async () => {
    const owner = await createUser();
    const post = await createPostRow({ userId: owner.userId });
    const moderator = await createUser();
    signIn(moderator, { roles: ['moderator'] });
    expect(await deletePost({ postId: post.postId })).toEqual({ ok: false, error: 'FORBIDDEN' });
  });

  it('olmayan gönderi → NOT_FOUND; anonim → UNAUTHENTICATED; geçersiz id → VALIDATION', async () => {
    expect(await deletePost({ postId: 1 })).toEqual({ ok: false, error: 'UNAUTHENTICATED' });
    await writer();
    expect(await deletePost({ postId: 2_000_000_000 })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    expect(await deletePost({ postId: -1 })).toEqual({ ok: false, error: 'VALIDATION' });
  });

  it('e-postası doğrulanmamış kullanıcı silemez (requireWriter)', async () => {
    const user = await createUser({ isEmailVerified: false });
    const post = await createPostRow({ userId: user.userId });
    signIn(user);
    expect(await deletePost({ postId: post.postId })).toEqual({
      ok: false,
      error: 'EMAIL_NOT_VERIFIED',
    });
  });
});

describe('setPostLike', () => {
  it('idempotent: iki kez liked:true tek satır; liked:false siler; tekrar false da başarı', async () => {
    const post = await createPostRow();
    const user = await writer();
    expect(await setPostLike({ postId: post.postId, liked: true })).toEqual({
      ok: true,
      data: { liked: true },
    });
    expect((await setPostLike({ postId: post.postId, liked: true })).ok).toBe(true);
    expect(await getDb().postLike.count({ where: { userId: user.userId } })).toBe(1);
    expect(await setPostLike({ postId: post.postId, liked: false })).toEqual({
      ok: true,
      data: { liked: false },
    });
    expect((await setPostLike({ postId: post.postId, liked: false })).ok).toBe(true);
    expect(await getDb().postLike.count({ where: { userId: user.userId } })).toBe(0);
  });

  it('beğeni yarışı: eşzamanlı 8 istek → hepsi başarı, tek satır', async () => {
    const post = await createPostRow();
    const user = await writer();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => setPostLike({ postId: post.postId, liked: true }))
    );
    expect(results.every(r => r.ok)).toBe(true);
    expect(
      await getDb().postLike.count({ where: { userId: user.userId, postId: post.postId } })
    ).toBe(1);
  });

  it('silinmiş gönderi → NOT_FOUND; doğrulanmamış → EMAIL_NOT_VERIFIED', async () => {
    const post = await createPostRow({ deletedAt: new Date() });
    await writer();
    expect(await setPostLike({ postId: post.postId, liked: true })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
    await writer({ isEmailVerified: false });
    expect(await setPostLike({ postId: post.postId, liked: true })).toEqual({
      ok: false,
      error: 'EMAIL_NOT_VERIFIED',
    });
  });
});
