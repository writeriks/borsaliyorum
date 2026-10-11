import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { encodeScoreCursor } from '@/lib/db';
import { Prisma, PrismaClient } from '@/generated/prisma/client';
import { encodeCursor, getDb } from '@/lib/db';

import { workerDatabaseUrl } from '../../../../tests/db/worker';
import {
  blockUser,
  createComment,
  createPost,
  createStock,
  createUser,
  followStock,
  followUser,
  likePost,
} from '../../../../tests/factories';

vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => null }));

const {
  countNewFeedPosts,
  getDiscoverPosts,
  getFeedPage,
  getNewFeedPostCount,
  loadDiscoverPosts,
  loadFeedPage,
  loadFollowSummary,
} = await import('./feed');
const { findPostDetail } = await import('./queries');

const at = (minute: number): Date => new Date(Date.UTC(2026, 9, 10, 12, minute, 0));

const ids = async (
  viewerId: number,
  input: Parameters<typeof loadFeedPage>[2]
): Promise<{ ids: number[]; nextCursor: string | null; headCursor: string | null }> => {
  const result = await loadFeedPage(getDb(), viewerId, input);
  if (!result.ok) throw new Error(result.error);
  return {
    ids: result.data.items.map(item => item.id),
    nextCursor: result.data.nextCursor,
    headCursor: result.data.headCursor,
  };
};

/** Tüm sayfaları dolaşır; her sayfa en fazla `limit` öğe. */
const walk = async (
  viewerId: number,
  tab: 'latest' | 'popular',
  limit: number,
  now?: Date
): Promise<number[][]> => {
  const pages: number[][] = [];
  let cursor: string | undefined;
  for (let guard = 0; guard < 50; guard += 1) {
    const page = await ids(viewerId, { tab, cursor, limit, ...(now ? { now } : {}) });
    pages.push(page.ids);
    if (page.nextCursor === null) return pages;
    cursor = page.nextCursor;
  }
  throw new Error('sayfalama bitmedi');
};

describe('akış kapsamı ve gizleme', () => {
  it('kendi + takip edilen kullanıcı + takip edilen hisse gönderileri; diğerleri yok', async () => {
    const viewer = await createUser();
    const friend = await createUser();
    const stranger = await createUser();
    const stock = await createStock({ ticker: 'FEEDA' });
    const otherStock = await createStock({ ticker: 'FEEDB' });
    await followUser(viewer.userId, friend.userId);
    await followStock(viewer.userId, stock.stockId);
    // Ters yön takip kapsam değildir (stranger viewer'ı takip ediyor)
    await followUser(stranger.userId, viewer.userId);

    const own = await createPost({ userId: viewer.userId, createdAt: at(1) });
    const fromFriend = await createPost({ userId: friend.userId, createdAt: at(2) });
    const aboutStock = await createPost({
      userId: stranger.userId,
      createdAt: at(3),
      stockIds: [stock.stockId, otherStock.stockId],
    });
    await createPost({ userId: stranger.userId, createdAt: at(4) });
    await createPost({ userId: stranger.userId, createdAt: at(5), stockIds: [otherStock.stockId] });

    const page = await ids(viewer.userId, { tab: 'latest' });
    expect(page.ids).toEqual([aboutStock.postId, fromFriend.postId, own.postId]);
    expect(page.nextCursor).toBeNull();
  });

  it('silinmiş, moderasyonla kaldırılmış, iki yönlü engelli ve etkin olmayan yazar gizli', async () => {
    const viewer = await createUser();
    const stock = await createStock({ ticker: 'FEEDC' });
    await followStock(viewer.userId, stock.stockId);
    const visibleAuthor = await createUser();
    const blockedByViewer = await createUser();
    const blockerOfViewer = await createUser();
    const suspended = await createUser({ status: 'suspended' });
    await followUser(viewer.userId, blockedByViewer.userId);
    await blockUser(viewer.userId, blockedByViewer.userId);
    await blockUser(blockerOfViewer.userId, viewer.userId);

    const visible = await createPost({ userId: visibleAuthor.userId, stockIds: [stock.stockId] });
    await createPost({ userId: visibleAuthor.userId, stockIds: [stock.stockId], deletedAt: at(9) });
    await createPost({
      userId: visibleAuthor.userId,
      stockIds: [stock.stockId],
      deletedAt: at(9),
      removedByModeration: true,
    });
    // Savunma: bayrak tek başına da gizler
    await createPost({
      userId: visibleAuthor.userId,
      stockIds: [stock.stockId],
      removedByModeration: true,
    });
    await createPost({ userId: blockedByViewer.userId });
    await createPost({ userId: blockedByViewer.userId, stockIds: [stock.stockId] });
    await createPost({ userId: blockerOfViewer.userId, stockIds: [stock.stockId] });
    await createPost({ userId: suspended.userId, stockIds: [stock.stockId] });
    const ownDeleted = await createPost({ userId: viewer.userId, deletedAt: at(9) });

    const page = await ids(viewer.userId, { tab: 'latest' });
    expect(page.ids).toEqual([visible.postId]);
    expect(page.ids).not.toContain(ownDeleted.postId);

    const popular = await ids(viewer.userId, { tab: 'popular', now: new Date() });
    expect(popular.ids).toEqual([visible.postId]);
  });

  it('kart DTO: sayaçlar, beğeni, hisseler, link önizleme, mention adı; e-posta yok', async () => {
    const viewer = await createUser();
    const author = await createUser();
    const mentioned = await createUser({ username: 'akis_anilan', displayName: 'Akış Anılan' });
    const stock = await createStock({ ticker: 'FEEDD', companyName: 'AKIŞ TEST A.Ş.' });
    await followUser(viewer.userId, author.userId);
    const preview = await getDb().linkPreview.create({
      data: {
        urlHash: 'a'.repeat(64),
        url: 'https://haber.example/x',
        status: 'ok',
        siteName: 'Haber',
        title: 'Başlık',
        description: 'Açıklama',
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    const post = await createPost({
      userId: author.userId,
      content: '$FEEDD @akis_anilan',
      entities: {
        v: 1,
        items: [
          { type: 'cashtag', start: 0, end: 6, ticker: 'FEEDD', stockId: stock.stockId },
          { type: 'mention', start: 7, end: 19, username: 'akis_anilan', userId: mentioned.userId },
        ],
      },
      stockIds: [stock.stockId],
      linkPreviewId: preview.id,
    });
    await likePost(viewer.userId, post.postId);
    await likePost(mentioned.userId, post.postId);
    await createComment({ postId: post.postId });
    await createComment({ postId: post.postId, deletedAt: new Date() });

    const result = await loadFeedPage(getDb(), viewer.userId, { tab: 'latest' });
    if (!result.ok) throw new Error(result.error);
    const [card] = result.data.items;
    expect(card).toMatchObject({
      id: post.postId,
      author: { username: author.username, displayName: author.displayName },
      counts: { likes: 2, comments: 1, reposts: 0 },
      viewer: { liked: true, isOwner: false },
      stocks: { FEEDD: { ticker: 'FEEDD', companyName: 'AKIŞ TEST A.Ş.', stockType: 'stock' } },
      linkPreview: { status: 'ready', url: 'https://haber.example/x', title: 'Başlık' },
    });
    expect(card?.body.entities).toContainEqual(
      expect.objectContaining({ type: 'mention', displayName: 'Akış Anılan' })
    );
    const json = JSON.stringify(result.data);
    expect(json).not.toContain(author.email);
    expect(json).not.toContain(author.firebaseUserId);
  });

  it('eski format gövde: mention kullanıcı adından çözülür, kart gövdesi detaydakiyle aynı', async () => {
    const viewer = await createUser();
    const author = await createUser();
    const mentioned = await createUser({ username: 'Akis_Eski_Uye', displayName: 'Akış Eski Üye' });
    await followUser(viewer.userId, author.userId);
    const post = await createPost({
      userId: author.userId,
      content: '@(akis_eski_uye) ne der?',
      contentFormat: 1,
      createdAt: new Date(Date.UTC(2029, 0, 1)),
    });

    const result = await loadFeedPage(getDb(), viewer.userId, { tab: 'latest' });
    if (!result.ok) throw new Error(result.error);
    const card = result.data.items.find(item => item.id === post.postId);
    expect(card?.body.entities).toContainEqual(
      expect.objectContaining({
        type: 'mention',
        username: mentioned.username,
        displayName: 'Akış Eski Üye',
      })
    );
    const detail = await findPostDetail(getDb(), { userId: viewer.userId }, post.postId);
    if (detail.status !== 'ok') throw new Error(detail.status);
    expect(card?.body).toEqual(detail.post.body);
  });
});

describe('keşfet önerisi (boş akış)', () => {
  it('kapsamdan bağımsız görünür son gönderiler; engelli/silinmiş/askıdaki hariç, limitli', async () => {
    // Dosyadaki diğer testlerin verisi de görünür: bu testin gönderileri en yeniler olsun
    const late = (minute: number): Date => new Date(Date.UTC(2030, 0, 1, 0, minute));
    const viewer = await createUser();
    const stranger = await createUser();
    const blocker = await createUser();
    const suspended = await createUser({ status: 'suspended' });
    await blockUser(blocker.userId, viewer.userId);
    const older = await createPost({ userId: stranger.userId, createdAt: late(1) });
    const newer = await createPost({ userId: stranger.userId, createdAt: late(2) });
    await createPost({ userId: stranger.userId, createdAt: late(3), deletedAt: late(4) });
    await createPost({ userId: blocker.userId, createdAt: late(5) });
    await createPost({ userId: suspended.userId, createdAt: late(6) });

    const posts = await loadDiscoverPosts(getDb(), viewer.userId);
    expect(posts.length).toBeLessThanOrEqual(10);
    // Gizlenenler (daha yeni olsalar da) yok; görünür en yeni iki gönderi başta
    expect(posts.slice(0, 2).map(post => post.id)).toEqual([newer.postId, older.postId]);
    expect(
      posts.every(
        post => post.author.username === stranger.username || post.createdAt < late(0).toISOString()
      )
    ).toBe(true);
    expect((await loadDiscoverPosts(getDb(), viewer.userId, 1)).map(post => post.id)).toEqual([
      newer.postId,
    ]);
    expect(await getDiscoverPosts()).toEqual([]);
  });
});

describe('En yeni: cursor sınırları', () => {
  it('aynı createdAt’li gönderilerde tekrar/atlama yok; sıra (createdAt, postId) azalan', async () => {
    const viewer = await createUser();
    const friend = await createUser();
    await followUser(viewer.userId, friend.userId);
    const same = at(30);
    const created = [];
    for (let i = 0; i < 7; i += 1) {
      created.push(await createPost({ userId: friend.userId, createdAt: same }));
    }
    created.push(await createPost({ userId: viewer.userId, createdAt: at(31) }));
    created.push(await createPost({ userId: friend.userId, createdAt: at(29) }));
    const expected = [...created]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.postId - a.postId)
      .map(post => post.postId);

    for (const limit of [1, 2, 3, 4]) {
      const pages = await walk(viewer.userId, 'latest', limit);
      expect(pages.flat(), `limit ${limit}`).toEqual(expected);
      expect(pages.every(page => page.length <= limit)).toBe(true);
    }
  });

  it('tam sayfa sonunda nextCursor null (fazladan boş sayfa yok); headCursor yalnızca ilk sayfada', async () => {
    const viewer = await createUser();
    await createPost({ userId: viewer.userId, createdAt: at(1) });
    await createPost({ userId: viewer.userId, createdAt: at(2) });
    const first = await ids(viewer.userId, { tab: 'latest', limit: 2 });
    expect(first.ids).toHaveLength(2);
    expect(first.nextCursor).toBeNull();
    expect(first.headCursor).not.toBeNull();

    const one = await ids(viewer.userId, { tab: 'latest', limit: 1 });
    expect(one.nextCursor).not.toBeNull();
    const second = await ids(viewer.userId, {
      tab: 'latest',
      limit: 1,
      cursor: one.nextCursor ?? undefined,
    });
    expect(second.headCursor).toBeNull();
  });

  it('bozuk ya da başka sekmenin imleci VALIDATION (ilk sayfaya düşmez)', async () => {
    const viewer = await createUser();
    const popularCursor = encodeScoreCursor({ score: 1, createdAt: at(1), id: 1, asOf: at(2) });
    const latestCursor = encodeCursor({ createdAt: at(1), id: 1 });
    for (const [tab, cursor] of [
      ['latest', 'bozuk!'],
      ['latest', popularCursor],
      ['popular', latestCursor],
    ] as const) {
      expect(await loadFeedPage(getDb(), viewer.userId, { tab, cursor })).toEqual({
        ok: false,
        error: 'VALIDATION',
      });
    }
  });
});

describe('Popüler sıralama', () => {
  it('puan = beğeni + 2 × silinmemiş yorum; eşitlikte yeni önce; pencere dışı yok', async () => {
    const now = new Date('2026-10-11T12:00:00.000Z');
    const hoursAgo = (h: number): Date => new Date(now.getTime() - h * 3_600_000);
    const viewer = await createUser();
    const friend = await createUser();
    await followUser(viewer.userId, friend.userId);
    const likers = await Promise.all([createUser(), createUser(), createUser()]);

    const threeLikes = await createPost({ userId: friend.userId, createdAt: hoursAgo(5) });
    const twoComments = await createPost({ userId: friend.userId, createdAt: hoursAgo(6) });
    const oneLikeOld = await createPost({ userId: friend.userId, createdAt: hoursAgo(10) });
    const oneLikeNew = await createPost({ userId: friend.userId, createdAt: hoursAgo(2) });
    const zero = await createPost({ userId: viewer.userId, createdAt: hoursAgo(1) });
    const outside = await createPost({ userId: friend.userId, createdAt: hoursAgo(24 * 8) });
    const future = await createPost({
      userId: friend.userId,
      createdAt: new Date(now.getTime() + 60_000),
    });

    for (const liker of likers) await likePost(liker.userId, threeLikes.postId);
    await createComment({ postId: twoComments.postId, createdAt: hoursAgo(1) });
    await createComment({ postId: twoComments.postId, createdAt: hoursAgo(1) });
    await createComment({ postId: twoComments.postId, createdAt: hoursAgo(1), deletedAt: now });
    await likePost(likers[0]?.userId ?? 0, oneLikeOld.postId);
    await likePost(likers[0]?.userId ?? 0, oneLikeNew.postId);
    for (const liker of likers) await likePost(liker.userId, outside.postId);

    const page = await ids(viewer.userId, { tab: 'popular', now });
    // twoComments: 4 > threeLikes: 3 > oneLikeNew (1, daha yeni) > oneLikeOld (1) > zero
    expect(page.ids).toEqual([
      twoComments.postId,
      threeLikes.postId,
      oneLikeNew.postId,
      oneLikeOld.postId,
      zero.postId,
    ]);
    expect(page.ids).not.toContain(outside.postId);
    expect(page.ids).not.toContain(future.postId);
    expect(page.headCursor).toBeNull();
  });

  it('sayfalar arasında gelen beğeni sırayı kaydırmaz (anlık görüntü): tekrar/atlama yok', async () => {
    const viewer = await createUser();
    const friend = await createUser();
    await followUser(viewer.userId, friend.userId);
    const base = Date.now();
    const posts = [];
    for (let i = 0; i < 6; i += 1) {
      posts.push(
        await createPost({ userId: friend.userId, createdAt: new Date(base - (i + 1) * 60_000) })
      );
    }
    const liker = await createUser();
    await likePost(liker.userId, posts[5]?.postId ?? 0);
    // Anlık görüntü ilk beğeniden sonra; sonraki beğeniler `likedAt > asOf`
    await new Promise(resolve => setTimeout(resolve, 20));
    const snapshot = new Date();
    await new Promise(resolve => setTimeout(resolve, 20));

    const first = await ids(viewer.userId, { tab: 'popular', limit: 3, now: snapshot });
    // İlk sayfadan sonra sondaki gönderiler beğeni alır; anlık görüntü yüzünden sıra değişmez
    for (const later of await Promise.all([createUser(), createUser()])) {
      await likePost(later.userId, posts[4]?.postId ?? 0);
    }
    const second = await ids(viewer.userId, {
      tab: 'popular',
      limit: 3,
      cursor: first.nextCursor ?? undefined,
    });
    const all = [...first.ids, ...second.ids];
    expect(new Set(all).size).toBe(6);
    expect(all).toEqual([
      posts[5]?.postId,
      posts[0]?.postId,
      posts[1]?.postId,
      posts[2]?.postId,
      posts[3]?.postId,
      posts[4]?.postId,
    ]);
    expect(second.nextCursor).toBeNull();
  });
});

describe('Popüler: sayfalar arasında puan düşerse', () => {
  it('beğeni geri çekme ve yorum silme atlama üretmez; tekrar olabilir, istemci ayıklar', async () => {
    const viewer = await createUser();
    const friend = await createUser();
    await followUser(viewer.userId, friend.userId);
    const base = Date.now();
    const post = (minutes: number) =>
      createPost({ userId: friend.userId, createdAt: new Date(base - minutes * 60_000) });
    // Puanlar: A=4 (2 yorum), B=3 (3 beğeni), C=2, D=1, E=0, F=0
    const [a, b, c, d, e, f] = await Promise.all([
      post(1),
      post(2),
      post(3),
      post(4),
      post(5),
      post(6),
    ]);
    if (!a || !b || !c || !d || !e || !f) throw new Error('tohum');
    const likers = await Promise.all([createUser(), createUser(), createUser()]);
    const comments = await Promise.all([
      createComment({ postId: a.postId, createdAt: new Date(base - 30_000) }),
      createComment({ postId: a.postId, createdAt: new Date(base - 30_000) }),
    ]);
    for (const liker of likers) await likePost(liker.userId, b.postId);
    for (const liker of likers.slice(0, 2)) await likePost(liker.userId, c.postId);
    await likePost(likers[0]?.userId ?? 0, d.postId);
    await new Promise(resolve => setTimeout(resolve, 20));
    const snapshot = new Date();
    await new Promise(resolve => setTimeout(resolve, 20));

    const first = await ids(viewer.userId, { tab: 'popular', limit: 2, now: snapshot });
    expect(first.ids).toEqual([a.postId, b.postId]);

    // İlk sayfadan sonra: A'nın yorumları silinir, B'nin beğenileri geri çekilir
    await getDb().comment.updateMany({
      where: { commentId: { in: comments.map(comment => comment.commentId) } },
      data: { deletedAt: new Date() },
    });
    await getDb().postLike.deleteMany({ where: { postId: b.postId } });

    const seen = [...first.ids];
    let cursor = first.nextCursor;
    for (let guard = 0; cursor !== null && guard < 10; guard += 1) {
      const next = await ids(viewer.userId, { tab: 'popular', limit: 2, cursor });
      seen.push(...next.ids);
      cursor = next.nextCursor;
    }
    // Atlama yok: her gönderi en az bir kez, ilk görülme sırası anlık görüntüye uygun
    const unique = [...new Set(seen)];
    expect(unique).toEqual([a.postId, b.postId, c.postId, d.postId, e.postId, f.postId]);
    // A'nın puanı anlık görüntüde (silinen yorumlar asOf'tan sonra) → A tekrar gelmez
    expect(seen.filter(id => id === a.postId)).toHaveLength(1);
    // B'nin beğeni satırları silindi → puanı düştü, sonraki sayfada tekrar gelebilir
    expect(seen.filter(id => id === b.postId).length).toBeGreaterThanOrEqual(1);
  });
});

describe('yeni gönderi sayımı', () => {
  it('headCursor’dan yeni, başkalarının kapsamdaki gönderileri; kendi ve kapsam dışı sayılmaz', async () => {
    const viewer = await createUser();
    const friend = await createUser();
    const stranger = await createUser();
    await followUser(viewer.userId, friend.userId);
    await createPost({ userId: friend.userId, createdAt: at(1) });
    const head = await ids(viewer.userId, { tab: 'latest' });
    expect(head.headCursor).not.toBeNull();
    const since = head.headCursor ?? '';

    await createPost({ userId: friend.userId, createdAt: at(2) });
    await createPost({ userId: friend.userId, createdAt: at(3) });
    await createPost({ userId: viewer.userId, createdAt: at(4) });
    await createPost({ userId: stranger.userId, createdAt: at(5) });
    await createPost({ userId: friend.userId, createdAt: at(6), deletedAt: at(7) });

    expect(await countNewFeedPosts(getDb(), viewer.userId, since)).toEqual({
      ok: true,
      data: { count: 2 },
    });
    expect(await countNewFeedPosts(getDb(), viewer.userId, 'x')).toEqual({
      ok: false,
      error: 'VALIDATION',
    });
  });
});

describe('DAL yetkisi', () => {
  it('anonim görüntüleyen UNAUTHENTICATED; takip özeti boş', async () => {
    expect(await getFeedPage({ tab: 'latest' })).toEqual({ ok: false, error: 'UNAUTHENTICATED' });
    expect(await getNewFeedPostCount(encodeCursor({ createdAt: at(1), id: 1 }))).toEqual({
      ok: false,
      error: 'UNAUTHENTICATED',
    });
  });

  it('takip özeti kullanıcı ve hisse sayısını verir', async () => {
    const viewer = await createUser();
    const other = await createUser();
    const stock = await createStock();
    expect(await loadFollowSummary(getDb(), viewer.userId)).toEqual({ users: 0, stocks: 0 });
    await followUser(viewer.userId, other.userId);
    await followStock(viewer.userId, stock.stockId);
    expect(await loadFollowSummary(getDb(), viewer.userId)).toEqual({ users: 1, stocks: 1 });
  });
});

describe('performans: sorgu sayısı ve plan', () => {
  let logged: { prisma: PrismaClient; pool: Pool; queries: string[] };

  beforeAll(() => {
    const pool = new Pool({ connectionString: workerDatabaseUrl(), max: 2 });
    const prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
      log: [{ emit: 'event', level: 'query' }],
    });
    const queries: string[] = [];
    prisma.$on('query', event => queries.push(event.query));
    logged = { prisma, pool, queries };
  });

  afterAll(async () => {
    await logged.prisma.$disconnect();
    await logged.pool.end();
  });

  it('sayfa başına sabit 2 sorgu (kartlar + mention adları), gönderi sayısından bağımsız', async () => {
    const viewer = await createUser();
    const friend = await createUser();
    const mentioned = await createUser();
    const stock = await createStock();
    await followUser(viewer.userId, friend.userId);
    for (let i = 0; i < 12; i += 1) {
      // v2 kimlikli ve eski format (kullanıcı adlı) mention'lar karışık: yine tek kullanıcı sorgusu
      const post = await createPost(
        i % 2 === 0
          ? {
              userId: friend.userId,
              content: '@m',
              entities: {
                v: 1,
                items: [
                  { type: 'mention', start: 0, end: 2, username: 'm', userId: mentioned.userId },
                ],
              },
              stockIds: [stock.stockId],
            }
          : {
              userId: friend.userId,
              content: `@(${mentioned.username})`,
              contentFormat: 1,
              stockIds: [stock.stockId],
            }
      );
      await likePost(viewer.userId, post.postId);
      await createComment({ postId: post.postId });
    }

    for (const tab of ['latest', 'popular'] as const) {
      logged.queries.length = 0;
      const result = await loadFeedPage(logged.prisma, viewer.userId, { tab, limit: 10 });
      expect(result.ok && result.data.items.length).toBe(10);
      expect(logged.queries, tab).toHaveLength(2);
    }
  });

  /**
   * EXPLAIN: test tabloları küçük; `enable_seqscan = off` ile index'lerin *kullanılabilir*
   * olduğu doğrulanır (autocomplete testiyle aynı yöntem). Keyset karşılaştırması bir cursor
   * index'inin koşuludur (tabloyu tarayıp filtrelemez); sayaç/beğeni alt sorguları index'li.
   */
  it('EXPLAIN: keyset index’i ve sayaç index’leri kullanılır', async () => {
    const viewer = await createUser();
    const cursor = encodeCursor({ createdAt: at(1), id: 1_000_000 });
    const plans = await getDb().$transaction(async tx => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      const collected: string[] = [];
      const explaining = {
        $queryRaw: async (query: Prisma.Sql) => {
          const rows = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`EXPLAIN ${query}`);
          collected.push(rows.map(row => row['QUERY PLAN']).join('\n'));
          return [];
        },
      } as unknown as PrismaClient;
      await loadFeedPage(explaining, viewer.userId, { tab: 'latest', cursor });
      return collected;
    });
    expect(plans).toHaveLength(1);
    const plan = plans[0] ?? '';
    // Keyset koşulu index koşulu olarak (filtre değil): global ya da yazar başına cursor index'i
    expect(plan).toMatch(/Index Scan( Backward)? using "Post_(user_)?feed_cursor_idx"/);
    expect(plan).toMatch(/Index Cond: .*ROW\("createdAt", "postId"\) < ROW\(/);
    expect(plan).toContain('PostLikes_postId_idx');
    expect(plan).toContain('PostLikes_userId_postId_key');
    expect(plan).not.toMatch(/Seq Scan on "?Post"? /);
  });
});
