import { describe, expect, it, vi } from 'vitest';

import { ErrorCode, fail, ok } from '@/lib/errors';
import { createMemoryRateLimiter } from '@/lib/rate-limit/memory';

import { createPost, createUser, followUser } from '../../../../tests/factories';

// DAL'ın oturum okuyan sarmalayıcıları burada kullanılmaz; next-intl navigasyonu yüklenmesin
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => null }));

const { handleFeedRequest, handleNewPostsRequest } = await import('./feed-route');

const request = (path: string): Request => new Request(`http://localhost${path}`);
const asUser = (userId: number) => async () => ok({ userId });

describe('GET /api/feed', () => {
  it('ilk sayfa ve sonraki sayfa; yanıt paylaşılan önbelleğe girmez', async () => {
    const viewer = await createUser();
    const friend = await createUser();
    await followUser(viewer.userId, friend.userId);
    for (let i = 0; i < 21; i += 1) await createPost({ userId: friend.userId });

    const first = await handleFeedRequest(request('/api/feed'), {
      authorize: asUser(viewer.userId),
    });
    expect(first.status).toBe(200);
    expect(first.headers.get('cache-control')).toBe('private, no-store');
    const body = (await first.json()) as {
      ok: true;
      data: { items: unknown[]; nextCursor: string; headCursor: string };
    };
    expect(body.data.items).toHaveLength(20);
    expect(body.data.headCursor).toEqual(expect.any(String));

    const second = await handleFeedRequest(
      request(`/api/feed?tab=latest&cursor=${body.data.nextCursor}`),
      { authorize: asUser(viewer.userId) }
    );
    const next = (await second.json()) as { data: { items: unknown[]; nextCursor: null } };
    expect(next.data.items).toHaveLength(1);
    expect(next.data.nextCursor).toBeNull();
  });

  it.each([
    ['anonim', async () => fail(ErrorCode.UNAUTHENTICATED), '/api/feed', 401],
    ['onboarding eksik', async () => fail(ErrorCode.ONBOARDING_REQUIRED), '/api/feed', 403],
    ['bilinmeyen sekme', asUser(1), '/api/feed?tab=hepsi', 400],
    ['bozuk imleç', asUser(1), '/api/feed?cursor=%%%', 400],
  ])('%s → %s', async (_label, authorize, path, status) => {
    const response = await handleFeedRequest(request(path), { authorize });
    expect(response.status).toBe(status);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('kullanıcı başına sınır aşılınca 429 + Retry-After', async () => {
    const viewer = await createUser();
    const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 60_000 });
    const deps = { authorize: asUser(viewer.userId), limiter };
    expect((await handleFeedRequest(request('/api/feed'), deps)).status).toBe(200);
    const limited = await handleFeedRequest(request('/api/feed'), deps);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});

describe('GET /api/feed/new', () => {
  it('headCursor’dan yeni gönderi sayısı; since eksikse 400', async () => {
    const viewer = await createUser();
    const friend = await createUser();
    await followUser(viewer.userId, friend.userId);
    await createPost({ userId: friend.userId, createdAt: new Date('2026-10-10T10:00:00Z') });
    const first = await handleFeedRequest(request('/api/feed'), {
      authorize: asUser(viewer.userId),
    });
    const { data } = (await first.json()) as { data: { headCursor: string } };
    await createPost({ userId: friend.userId, createdAt: new Date('2026-10-10T11:00:00Z') });

    const response = await handleNewPostsRequest(
      request(`/api/feed/new?since=${data.headCursor}`),
      {
        authorize: asUser(viewer.userId),
      }
    );
    expect(await response.json()).toEqual({ ok: true, data: { count: 1 } });

    const missing = await handleNewPostsRequest(request('/api/feed/new'), {
      authorize: asUser(viewer.userId),
    });
    expect(missing.status).toBe(400);
  });
});
