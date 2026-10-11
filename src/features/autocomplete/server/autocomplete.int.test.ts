import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@/generated/prisma/client';
import { getDb } from '@/lib/db';
import { ErrorCode, fail, ok } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { createMemoryRateLimiter } from '@/lib/rate-limit/memory';

import {
  blockUser,
  createPost,
  createStock,
  createTag,
  createUser,
  followStock,
  followUser,
} from '../../../../tests/factories';

import {
  queryTagUsage,
  suggestTags,
  suggestUsers,
  SUGGESTION_LIMIT,
  type AutocompleteDb,
} from './queries';
import {
  AUTOCOMPLETE_IP_RATE_LIMIT,
  AUTOCOMPLETE_USER_RATE_LIMIT,
  CACHE_CONTROL,
  handleDefaultStocksRequest,
  handleStockIndexRequest,
  handleTagSuggestionsRequest,
  handleUserSuggestionsRequest,
  type AutocompleteHandlerDeps,
} from './route-handlers';

const silent = createLogger({ level: 'silent' });
const NOW = new Date('2026-10-10T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number): Date => new Date(NOW.getTime() - ms);
const BUCKET = 'ornek';
const AVATAR = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/a.png?alt=media`;

beforeEach(async () => {
  await getDb().$executeRawUnsafe(
    'TRUNCATE "User", "Stock", "Tag", "Post" RESTART IDENTITY CASCADE'
  );
});

const asUser = (userId: number): AutocompleteHandlerDeps => ({
  authorize: async () => ok({ userId }),
  logger: silent,
  now: () => NOW,
  userLimiter: createMemoryRateLimiter(AUTOCOMPLETE_USER_RATE_LIMIT),
  mediaBucket: () => BUCKET,
  // Route'ta 10 dk `unstable_cache`; testte doğrudan DAL (Next önbelleği yok)
  loadTagUsage: () => queryTagUsage(getDb(), NOW),
});

/** Gerçek DB'ye giden ama her `$queryRaw` SQL metnini kaydeden sarmalayıcı. */
const recordingDb = (): { db: () => AutocompleteDb; sql: string[] } => {
  const sql: string[] = [];
  const real = getDb();
  const db = {
    stockFollow: real.stockFollow,
    $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
      sql.push(strings.join('?'));
      return real.$queryRaw(strings, ...values);
    },
  } as unknown as AutocompleteDb;
  return { db: () => db, sql };
};

const request = (path: string, headers: Record<string, string> = {}): Request =>
  new Request(`http://app.test/api/autocomplete/${path}`, { headers });

const getUsers = async (viewerId: number, q: string): Promise<Response> =>
  handleUserSuggestionsRequest(request(`users?q=${encodeURIComponent(q)}`), asUser(viewerId));

const usernames = async (viewerId: number, q: string): Promise<string[]> => {
  const response = await getUsers(viewerId, q);
  expect(response.status).toBe(200);
  return ((await response.json()) as { username: string }[]).map(user => user.username);
};

describe('oturum kapısı', () => {
  it.each([
    [ErrorCode.UNAUTHENTICATED, 401],
    [ErrorCode.ONBOARDING_REQUIRED, 403],
  ] as const)('users/tags/default: %s → %i, no-store', async (error, status) => {
    const deps: AutocompleteHandlerDeps = { authorize: async () => fail(error), logger: silent };
    for (const response of [
      await handleUserSuggestionsRequest(request('users?q=ali'), deps),
      await handleTagSuggestionsRequest(request('tags?q=bist'), deps),
      await handleDefaultStocksRequest(deps),
    ]) {
      expect(response.status).toBe(status);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toEqual({ ok: false, error });
    }
  });

  it('anonim kullanıcı geçersiz sorguda da 401 alır (doğrulama sızmaz)', async () => {
    const response = await handleUserSuggestionsRequest(request('users?q=a%20b'), {
      authorize: async () => fail(ErrorCode.UNAUTHENTICATED),
      logger: silent,
    });
    expect(response.status).toBe(401);
  });
});

describe('GET /api/autocomplete/stocks', () => {
  it('tüm indeks kod sırasıyla; m = son 7 günde anıldığı silinmemiş gönderi sayısı', async () => {
    const thyao = await createStock({ ticker: 'THYAO', companyName: 'TÜRK HAVA YOLLARI A.O.' });
    const asels = await createStock({ ticker: 'ASELS', companyName: 'ASELSAN' });
    await createStock({ ticker: 'BTC', companyName: 'BITCOIN', stockType: 'crypto' });
    await createPost({ stockIds: [thyao.stockId], createdAt: ago(DAY) });
    await createPost({ stockIds: [thyao.stockId, asels.stockId], createdAt: ago(6 * DAY) });
    await createPost({ stockIds: [thyao.stockId], createdAt: ago(8 * DAY) });
    await createPost({ stockIds: [asels.stockId], createdAt: ago(DAY), deletedAt: ago(1000) });

    const response = await handleStockIndexRequest(request('stocks'), { now: () => NOW });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(CACHE_CONTROL.stockIndex);
    expect(response.headers.get('cache-control')).toMatch(/^public, .*s-maxage=86400/);
    expect(await response.json()).toEqual([
      { t: 'ASELS', n: 'ASELSAN', type: 'stock', m: 1 },
      { t: 'BTC', n: 'BITCOIN', type: 'crypto', m: 0 },
      { t: 'THYAO', n: 'TÜRK HAVA YOLLARI A.O.', type: 'stock', m: 2 },
    ]);
  });

  it('IP başına rate limit (IP özeti anahtarda); başka IP etkilenmez', async () => {
    await createStock({ ticker: 'THYAO' });
    const ipLimiter = createMemoryRateLimiter(AUTOCOMPLETE_IP_RATE_LIMIT);
    const deps = { now: () => NOW, ipLimiter, loadStockIndex: async () => [] };
    const from = (ip: string): Request => request('stocks', { 'x-real-ip': ip });
    for (let i = 0; i < AUTOCOMPLETE_IP_RATE_LIMIT.limit; i += 1) {
      expect((await handleStockIndexRequest(from('198.51.100.7'), deps)).status).toBe(200);
    }
    const limited = await handleStockIndexRequest(from('198.51.100.7'), deps);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('cache-control')).toBe('no-store');
    expect(limited.headers.get('retry-after')).toBe('60');
    expect((await handleStockIndexRequest(from('198.51.100.8'), deps)).status).toBe(200);
  });
});

describe('Cache-Control: kullanıcıya özel uçlar HTTP önbelleğine girmez', () => {
  it('stocks/default, users, tags → private, no-store; stocks (herkese açık) → public', async () => {
    const viewer = await createUser();
    const deps = asUser(viewer.userId);
    const responses = [
      await handleDefaultStocksRequest(deps),
      await handleUserSuggestionsRequest(request('users?q='), deps),
      await handleUserSuggestionsRequest(request('users?q=ali'), deps),
      await handleTagSuggestionsRequest(request('tags?q='), deps),
      await handleTagSuggestionsRequest(request('tags?q=bist'), deps),
    ];
    for (const response of responses) {
      expect(response.status).toBe(200);
      const header = response.headers.get('cache-control') ?? '';
      expect(header).toBe('private, no-store');
      expect(header).not.toMatch(/max-age|public|s-maxage/);
    }
    const index = await handleStockIndexRequest(request('stocks'), { now: () => NOW });
    expect(index.headers.get('cache-control')).toMatch(/^public, /);
  });
});

describe('GET /api/autocomplete/stocks/default', () => {
  it('takip edilen hisseler, son takip edilen önce; private cache', async () => {
    const viewer = await createUser();
    const a = await createStock({ ticker: 'AKBNK' });
    const t = await createStock({ ticker: 'THYAO' });
    await followStock(viewer.userId, a.stockId);
    await getDb().stockFollow.create({
      data: { userId: viewer.userId, stockId: t.stockId, followedAt: new Date(Date.now() + 1000) },
    });
    const response = await handleDefaultStocksRequest(asUser(viewer.userId));
    expect(response.headers.get('cache-control')).toBe(CACHE_CONTROL.defaultStocks);
    expect(await response.json()).toEqual({ source: 'following', tickers: ['THYAO', 'AKBNK'] });
  });

  it('takip yoksa son 24 saatte en çok anılanlar (eski ve silinmiş gönderiler sayılmaz)', async () => {
    const viewer = await createUser();
    const [a, b, c] = [
      await createStock({ ticker: 'AKBNK' }),
      await createStock({ ticker: 'BIMAS' }),
      await createStock({ ticker: 'SISE' }),
    ];
    await createPost({ stockIds: [b.stockId], createdAt: ago(1000) });
    await createPost({ stockIds: [b.stockId], createdAt: ago(2000) });
    await createPost({ stockIds: [a.stockId], createdAt: ago(3000) });
    await createPost({ stockIds: [c.stockId], createdAt: ago(2 * DAY) });
    await createPost({ stockIds: [c.stockId], createdAt: ago(100), deletedAt: ago(10) });
    const response = await handleDefaultStocksRequest(asUser(viewer.userId));
    expect(await response.json()).toEqual({ source: 'mostMentioned', tickers: ['BIMAS', 'AKBNK'] });
  });
});

describe('GET /api/autocomplete/users', () => {
  it('sıralama: tam eşleşme > takip edilen önek > diğer önek > görünen ad kelime başı', async () => {
    const viewer = await createUser({ username: 'izleyen' });
    await createUser({ username: 'aliveli' });
    const followed = await createUser({ username: 'alizz' });
    await createUser({ username: 'ali' });
    await createUser({ username: 'alican' });
    await createUser({ username: 'mehmet', displayName: 'Mehmet Ali Yılmaz' });
    await createUser({ username: 'baska', displayName: 'Başka Kişi' });
    await followUser(viewer.userId, followed.userId);

    expect(await usernames(viewer.userId, 'ali')).toEqual([
      'ali',
      'alizz',
      'alican',
      'aliveli',
      'mehmet',
    ]);
  });

  it('DTO: yalnızca username/displayName/avatarUrl/following; e-posta ve firebaseUid yok', async () => {
    const viewer = await createUser();
    const target = await createUser({
      username: 'ali_k',
      displayName: 'Ali Kaya',
      profilePhoto: AVATAR,
      email: 'gizli-eposta@example.test',
      firebaseUserId: 'gizli-firebase-uid',
    });
    await createUser({ username: 'ali_x', profilePhoto: 'https://izleme.ornek.com/p.png' });
    await followUser(viewer.userId, target.userId);
    const response = await getUsers(viewer.userId, 'ali_');
    expect(response.headers.get('cache-control')).toBe(CACHE_CONTROL.suggestions);
    const text = await response.text();
    expect(text).not.toContain('gizli-eposta');
    expect(text).not.toContain('gizli-firebase-uid');
    expect(text).not.toContain('"userId"');
    expect(JSON.parse(text)).toEqual([
      { username: 'ali_k', displayName: 'Ali Kaya', avatarUrl: AVATAR, following: true },
      { username: 'ali_x', displayName: expect.any(String), avatarUrl: null, following: false },
    ]);
  });

  it("avatar yalnızca kendi Storage bucket'ımızdaysa döner (aynı host, başka bucket → null)", async () => {
    const viewer = await createUser();
    await createUser({ username: 'bkt_ok', profilePhoto: AVATAR });
    await createUser({
      username: 'bkt_fb',
      profilePhoto: 'https://firebasestorage.googleapis.com/v0/b/kotu-bucket/o/p.png?alt=media',
    });
    await createUser({
      username: 'bkt_gcs',
      profilePhoto: 'https://storage.googleapis.com/kotu-bucket/p.png',
    });
    const response = await getUsers(viewer.userId, 'bkt_');
    const body = (await response.json()) as { username: string; avatarUrl: string | null }[];
    expect(body.map(user => [user.username, user.avatarUrl])).toEqual([
      ['bkt_fb', null],
      ['bkt_gcs', null],
      ['bkt_ok', AVATAR],
    ]);
  });

  it("görünen ad araması ikinci aşama: önek sonuçları 8'i doldurursa hiç çalışmaz", async () => {
    const viewer = await createUser();
    for (let i = 0; i < SUGGESTION_LIMIT; i += 1)
      await createUser({ username: `ay_${i}`, displayName: 'Ayşe' });
    await createUser({ username: 'zz_ayse', displayName: 'Ayşe Kaya' });
    const recorder = recordingDb();
    const response = await handleUserSuggestionsRequest(request('users?q=ay'), {
      ...asUser(viewer.userId),
      db: recorder.db,
    });
    const list = ((await response.json()) as { username: string }[]).map(user => user.username);
    expect(list).toHaveLength(SUGGESTION_LIMIT);
    expect(list).not.toContain('zz_ayse');
    expect(recorder.sql).toHaveLength(1);
    expect(recorder.sql.join('\n')).not.toContain('fold_tag');
  });

  it('görünen ad araması ikinci aşama: önek azsa kalan yer kadar eklenir, önekliler önde', async () => {
    const viewer = await createUser();
    await createUser({ username: 'ay_1' });
    await createUser({ username: 'ay_2' });
    for (let i = 0; i < 10; i += 1)
      await createUser({ username: `ad_${String(i).padStart(2, '0')}`, displayName: 'Ayşe' });
    const recorder = recordingDb();
    const response = await handleUserSuggestionsRequest(request('users?q=ay'), {
      ...asUser(viewer.userId),
      db: recorder.db,
    });
    const list = ((await response.json()) as { username: string }[]).map(user => user.username);
    expect(list).toEqual(['ay_1', 'ay_2', 'ad_00', 'ad_01', 'ad_02', 'ad_03', 'ad_04', 'ad_05']);
    expect(recorder.sql).toHaveLength(2);
    expect(recorder.sql[0]).not.toContain('fold_tag');
    expect(recorder.sql[1]).toContain('fold_tag');
  });

  it('tek karakterde görünen ad araması yapılmaz', async () => {
    const viewer = await createUser();
    await createUser({ username: 'zz_1', displayName: 'Ayşe' });
    const recorder = recordingDb();
    const response = await handleUserSuggestionsRequest(request('users?q=a'), {
      ...asUser(viewer.userId),
      db: recorder.db,
    });
    expect(await response.json()).toEqual([]);
    expect(recorder.sql).toHaveLength(1);
  });

  it('askıdaki/silinmiş, onboarding bekleyen, rezerve adlı, kendisi ve iki yönlü engelli hariç', async () => {
    const viewer = await createUser({ username: 'adam_izleyen' });
    await createUser({ username: 'adam_askida', status: 'suspended' });
    await createUser({ username: 'adam_silindi', status: 'deleted' });
    await createUser({ username: 'adam_yeni', onboardedAt: null });
    const blocked = await createUser({ username: 'adam_engelli' });
    const blocker = await createUser({ username: 'adam_engelleyen' });
    await blockUser(viewer.userId, blocked.userId);
    await blockUser(blocker.userId, viewer.userId);
    await createUser({ username: 'adam_ok' });
    // Eski hesaptan kalan rezerve ad (onboarding'e düşmemiş olsa bile önerilmez)
    await createUser({ username: 'admin' });

    expect(await usernames(viewer.userId, 'ad')).toEqual(['adam_ok']);
    expect(await usernames(viewer.userId, 'admin')).toEqual([]);
  });

  it('Türkçe: büyük İ/I/ı sorgusu katlanır; görünen adda ş/ı katlamalı kelime başı', async () => {
    const viewer = await createUser();
    await createUser({ username: 'ismail_k' });
    await createUser({ username: 'zz_1', displayName: 'Ayşe Işık' });
    expect(await usernames(viewer.userId, 'İSMA')).toEqual(['ismail_k']);
    expect(await usernames(viewer.userId, 'ISMA')).toEqual(['ismail_k']);
    expect(await usernames(viewer.userId, 'ays')).toEqual(['zz_1']);
    expect(await usernames(viewer.userId, 'isi')).toEqual(['zz_1']);
    // Kelime ortası eşleşmez
    expect(await usernames(viewer.userId, 'yse')).toEqual([]);
  });

  it('`_` joker değil: a_ öneki ab ile eşleşmez', async () => {
    const viewer = await createUser();
    await createUser({ username: 'a_b' });
    await createUser({ username: 'abc' });
    expect(await usernames(viewer.userId, 'a_')).toEqual(['a_b']);
  });

  it('en fazla 8 öneri; takip edilenler önce kalır', async () => {
    const viewer = await createUser();
    for (let i = 0; i < 12; i += 1)
      await createUser({ username: `kul_${String(i).padStart(2, '0')}` });
    const late = await createUser({ username: 'kul_zz' });
    await followUser(viewer.userId, late.userId);
    const list = await usernames(viewer.userId, 'kul');
    expect(list).toHaveLength(8);
    expect(list[0]).toBe('kul_zz');
    expect(list.slice(1)).toEqual([
      'kul_00',
      'kul_01',
      'kul_02',
      'kul_03',
      'kul_04',
      'kul_05',
      'kul_06',
    ]);
  });

  it('boş sorgu: takip ettiklerim, son takip edilen önce; askıdaki hariç', async () => {
    const viewer = await createUser();
    const first = await createUser({ username: 'birinci' });
    const second = await createUser({ username: 'ikinci' });
    const suspended = await createUser({ username: 'ucuncu', status: 'suspended' });
    await getDb().userFollow.createMany({
      data: [
        { followerId: viewer.userId, followingId: first.userId, followedAt: ago(3000) },
        { followerId: viewer.userId, followingId: second.userId, followedAt: ago(1000) },
        { followerId: viewer.userId, followingId: suspended.userId, followedAt: ago(10) },
      ],
    });
    expect(await usernames(viewer.userId, '')).toEqual(['ikinci', 'birinci']);
  });

  it.each(['a b', 'a'.repeat(21), 'ali-1', 'a%25'])('geçersiz q (%s) → 400', async q => {
    const viewer = await createUser();
    const response = await handleUserSuggestionsRequest(
      request(`users?q=${q}`),
      asUser(viewer.userId)
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'VALIDATION' });
  });

  it('kullanıcı başına dakikada 60 istek (users + tags ortak); başka kullanıcı etkilenmez', async () => {
    const viewer = await createUser();
    const other = await createUser();
    const deps = asUser(viewer.userId);
    for (let i = 0; i < AUTOCOMPLETE_USER_RATE_LIMIT.limit / 2; i += 1) {
      expect((await handleUserSuggestionsRequest(request('users?q=a'), deps)).status).toBe(200);
      expect((await handleTagSuggestionsRequest(request('tags?q=a'), deps)).status).toBe(200);
    }
    const limited = await handleUserSuggestionsRequest(request('users?q=a'), deps);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
    expect(await limited.json()).toEqual({
      ok: false,
      error: 'RATE_LIMITED',
      meta: { retryAfter: 60 },
    });
    const otherDeps = { ...asUser(other.userId), userLimiter: deps.userLimiter };
    expect((await handleUserSuggestionsRequest(request('users?q=a'), otherDeps)).status).toBe(200);
  });
});

describe('GET /api/autocomplete/tags', () => {
  const getTags = async (viewerId: number, q: string): Promise<unknown> => {
    const response = await handleTagSuggestionsRequest(
      request(`tags?q=${encodeURIComponent(q)}`),
      asUser(viewerId)
    );
    expect(response.status).toBe(200);
    return response.json();
  };

  it('önek; tam eşleşme önce, sonra son 30 günlük kullanım; eski/silinmiş sayılmaz', async () => {
    const viewer = await createUser();
    const bist100 = await createTag({ tagName: '#bist100', slug: 'bist100' });
    await createTag({ tagName: '#bist', slug: 'bist' });
    const bist30 = await createTag({ tagName: '#BIST30', slug: 'bist30' });
    await createTag({ tagName: '#bilanço', slug: 'bilanco' });
    await createTag({ tagName: '#eski', slug: null });
    for (const createdAt of [ago(DAY), ago(2 * DAY), ago(3 * DAY)]) {
      await createPost({ tagIds: [bist100.tagId], createdAt });
    }
    await createPost({ tagIds: [bist30.tagId], createdAt: ago(DAY) });
    for (let i = 0; i < 5; i += 1)
      await createPost({ tagIds: [bist30.tagId], createdAt: ago(40 * DAY) });
    await createPost({ tagIds: [bist30.tagId], createdAt: ago(100), deletedAt: ago(1) });

    expect(await getTags(viewer.userId, 'bist')).toEqual([
      { slug: 'bist', name: 'bist', count: 0 },
      { slug: 'bist100', name: 'bist100', count: 3 },
      { slug: 'bist30', name: 'BIST30', count: 1 },
    ]);
    // Türkçe büyük harf ve şapka katlanır
    expect(await getTags(viewer.userId, 'BİST1')).toEqual([
      { slug: 'bist100', name: 'bist100', count: 3 },
    ]);
    expect(await getTags(viewer.userId, 'Bilanç')).toEqual([
      { slug: 'bilanco', name: 'bilanço', count: 0 },
    ]);
  });

  it("sayımlar paylaşılan önbellekten: istek _PostTags'e dokunmaz, yükleyici bir kez çağrılır", async () => {
    const viewer = await createUser();
    const a = await createTag({ tagName: '#bist100', slug: 'bist100' });
    const b = await createTag({ tagName: '#bist30', slug: 'bist30' });
    await createPost({ tagIds: [a.tagId], createdAt: ago(DAY) });
    const recorder = recordingDb();
    // Önbellekteki (bayat olabilir) harita sıralamayı belirler; DB'deki gerçek sayım değil
    const loadTagUsage = vi.fn(async () => [[b.tagId, 7]] as const);
    const response = await handleTagSuggestionsRequest(request('tags?q=bist'), {
      ...asUser(viewer.userId),
      db: recorder.db,
      loadTagUsage,
    });
    expect(await response.json()).toEqual([
      { slug: 'bist30', name: 'bist30', count: 7 },
      { slug: 'bist100', name: 'bist100', count: 0 },
    ]);
    expect(loadTagUsage).toHaveBeenCalledTimes(1);
    expect(recorder.sql).toHaveLength(1);
    expect(recorder.sql[0]).not.toContain('_PostTags');
    expect(recorder.sql[0]).not.toContain('"Post"');
  });

  it('queryTagUsage: son 30 gün, silinmiş hariç, tüm etiketler tek sorguda', async () => {
    const a = await createTag({ tagName: '#a1', slug: 'a1' });
    const b = await createTag({ tagName: '#b1', slug: 'b1' });
    const c = await createTag({ tagName: '#c1', slug: 'c1' });
    await createPost({ tagIds: [a.tagId, b.tagId], createdAt: ago(DAY) });
    await createPost({ tagIds: [a.tagId], createdAt: ago(29 * DAY) });
    await createPost({ tagIds: [b.tagId], createdAt: ago(31 * DAY) });
    await createPost({ tagIds: [c.tagId], createdAt: ago(DAY), deletedAt: ago(1) });
    const usage = new Map(await queryTagUsage(getDb(), NOW));
    expect(usage).toEqual(
      new Map([
        [a.tagId, 2],
        [b.tagId, 1],
      ])
    );
  });

  it('eşitlikte son kullanım (updatedAt) sonra slug bayt sırası', async () => {
    const viewer = await createUser();
    const old = await createTag({ tagName: '#kapa', slug: 'kapa' });
    await createTag({ tagName: '#kapc', slug: 'kapc' });
    await createTag({ tagName: '#kapb', slug: 'kapb' });
    await getDb().tag.update({
      where: { tagId: old.tagId },
      data: { updatedAt: new Date(Date.now() + DAY) },
    });
    await getDb().$executeRawUnsafe(
      `UPDATE "Tag" SET "updatedAt" = '2026-01-01T00:00:00Z' WHERE "slug" IN ('kapb', 'kapc')`
    );
    expect(await getTags(viewer.userId, 'kap')).toEqual([
      { slug: 'kapa', name: 'kapa', count: 0 },
      { slug: 'kapb', name: 'kapb', count: 0 },
      { slug: 'kapc', name: 'kapc', count: 0 },
    ]);
  });

  it('en fazla 8 öneri', async () => {
    const viewer = await createUser();
    for (let i = 0; i < 12; i += 1) await createTag({ tagName: `#kap${i}`, slug: `kap${i}` });
    expect(await getTags(viewer.userId, 'kap')).toHaveLength(8);
  });

  it('boş sorgu: son 24 saatte en çok kullanılanlar', async () => {
    const viewer = await createUser();
    const a = await createTag({ tagName: '#halkaarz', slug: 'halkaarz' });
    const b = await createTag({ tagName: '#temettü', slug: 'temettu' });
    const c = await createTag({ tagName: '#eski', slug: 'eski' });
    await createPost({ tagIds: [b.tagId], createdAt: ago(1000) });
    await createPost({ tagIds: [b.tagId], createdAt: ago(2000) });
    await createPost({ tagIds: [a.tagId], createdAt: ago(3000) });
    await createPost({ tagIds: [c.tagId], createdAt: ago(2 * DAY) });
    expect(await getTags(viewer.userId, '')).toEqual([
      { slug: 'temettu', name: 'temettü', count: 2 },
      { slug: 'halkaarz', name: 'halkaarz', count: 1 },
    ]);
  });

  it.each(['bist 100', '%23bist', 'a'.repeat(51)])('geçersiz q (%s) → 400', async q => {
    const viewer = await createUser();
    const response = await handleTagSuggestionsRequest(
      request(`tags?q=${q}`),
      asUser(viewer.userId)
    );
    expect(response.status).toBe(400);
  });
});

/**
 * EXPLAIN: önek sorguları text_pattern_ops index'lerini kullanabiliyor mu? Test tabloları küçük
 * olduğundan planlayıcı normalde sıralı taramayı seçer; `enable_seqscan = off` ile index'in
 * *kullanılabilir* olduğu doğrulanır. `force_generic_plan`: parametreli (hazırlanmış) sorgu
 * planında da aralık operatörleri index'e gider (LIKE 'q%' parametreyle gidemezdi).
 */
describe('EXPLAIN: önek index kullanımı', () => {
  const explain = async (run: (db: AutocompleteDb) => Promise<unknown>): Promise<string> =>
    getDb().$transaction(async tx => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      await tx.$executeRawUnsafe('SET LOCAL plan_cache_mode = force_generic_plan');
      const plans: string[] = [];
      const db = {
        stockFollow: tx.stockFollow,
        $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
          const rows = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(
            Prisma.sql`EXPLAIN ${Prisma.sql(strings, ...values)}`
          );
          plans.push(rows.map(row => row['QUERY PLAN']).join('\n'));
          return [];
        },
      } as unknown as AutocompleteDb;
      await run(db);
      return plans.join('\n');
    });

  it('kullanıcı adı öneki User_username_lower_pattern_idx kullanır', async () => {
    const viewer = await createUser();
    const plan = await explain(db => suggestUsers(db, { userId: viewer.userId }, 'ali', BUCKET));
    expect(plan).toContain('User_username_lower_pattern_idx');
  });

  it('etiket öneki Tag_slug_pattern_idx kullanır; istek planında _PostTags/Post taraması yok', async () => {
    const plan = await explain(db => suggestTags(db, 'bist', new Map()));
    expect(plan).toContain('Tag_slug_pattern_idx');
    expect(plan).not.toContain('_PostTags');
    expect(plan).not.toMatch(/on "?Post"?\b/);
  });
});
