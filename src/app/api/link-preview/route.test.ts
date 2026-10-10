import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorCode, fail, ok } from '@/lib/errors';

const requireActionUser = vi.fn();
const consumeRateLimit = vi.fn();
const getOrFetchPreview = vi.fn();
const db = {};

vi.mock('@/lib/auth/session', () => ({
  requireActionUser: () => requireActionUser(),
}));
vi.mock('@/lib/db', () => ({ getDb: () => db }));
vi.mock('@/lib/rate-limit', () => ({
  consumeRateLimit: (...args: unknown[]) => consumeRateLimit(...args),
}));
vi.mock('@/lib/link-preview/get-or-fetch-preview', () => ({
  getOrFetchPreview: (...args: unknown[]) => getOrFetchPreview(...args),
}));

const { GET } = await import('./route');

const TARGET = 'https://www.kap.org.tr/tr/Bildirim/1';
const request = (): Request =>
  new Request(`http://localhost:3100/api/link-preview?url=${encodeURIComponent(TARGET)}`);

beforeEach(() => {
  requireActionUser.mockReset();
  consumeRateLimit.mockReset();
  getOrFetchPreview.mockReset();
  consumeRateLimit.mockResolvedValue({ allowed: true });
  getOrFetchPreview.mockResolvedValue(null);
});

describe('GET /api/link-preview (gerçek oturum kapısı)', () => {
  it.each([
    [ErrorCode.UNAUTHENTICATED, 401],
    [ErrorCode.ONBOARDING_REQUIRED, 403],
  ] as const)('requireActionUser %s → %i; rate limit ve fetch çalışmaz', async (error, status) => {
    requireActionUser.mockResolvedValue(fail(error));
    const response = await GET(request());
    expect(response.status).toBe(status);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: false, error });
    expect(consumeRateLimit).not.toHaveBeenCalled();
    expect(getOrFetchPreview).not.toHaveBeenCalled();
  });

  it('girişli kullanıcı: rate limit anahtarı oturumdaki userId, önizleme döner', async () => {
    requireActionUser.mockResolvedValue(ok({ userId: 42, username: 'ayse' }));
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { preview: null } });
    expect(consumeRateLimit).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ key: 'link-preview:u:42' }),
      expect.any(Date)
    );
    expect(getOrFetchPreview).toHaveBeenCalledWith(TARGET, expect.objectContaining({ db }));
  });
});
