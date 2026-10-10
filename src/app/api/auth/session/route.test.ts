import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fail, ok } from '@/lib/errors';

const createSession = vi.fn();
const destroySession = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  createSession: (...args: unknown[]) => createSession(...args),
  destroySession: () => destroySession(),
}));

const { DELETE, POST } = await import('./route');

const ORIGIN = 'http://localhost:3100';
const TOKEN = 'A'.repeat(43);

type RequestOptions = {
  method?: 'POST' | 'DELETE';
  origin?: string | null;
  csrfCookie?: string | null;
  csrfHeader?: string | null;
  body?: unknown;
};

const request = ({
  method = 'POST',
  origin = ORIGIN,
  csrfCookie = TOKEN,
  csrfHeader = TOKEN,
  body = { idToken: 'id-token' },
}: RequestOptions = {}): NextRequest => {
  const headers = new Headers({ host: 'localhost:3100', 'content-type': 'application/json' });
  if (origin) headers.set('origin', origin);
  if (csrfCookie) headers.set('cookie', `__Host-csrf=${csrfCookie}`);
  if (csrfHeader) headers.set('x-csrf-token', csrfHeader);
  headers.set('x-forwarded-for', '203.0.113.7');
  return new NextRequest(`${ORIGIN}/api/auth/session`, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
};

beforeEach(() => {
  createSession.mockReset();
  destroySession.mockReset();
});

describe('POST /api/auth/session', () => {
  it('başarıda __session çerezini HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=14 gün yazar', async () => {
    createSession.mockResolvedValue(
      ok({ cookie: 'session-cookie', session: { status: 'needs-onboarding' } })
    );
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, session: { status: 'needs-onboarding' } });
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('__session=session-cookie');
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toContain(`Max-Age=${14 * 24 * 60 * 60}`);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(createSession).toHaveBeenCalledWith(
      'id-token',
      expect.objectContaining({ ip: '203.0.113.7', port: null })
    );
  });

  it.each<[string, RequestOptions]>([
    ['başka Origin', { origin: 'https://evil.example' }],
    ['Origin yok', { origin: null }],
    ['CSRF başlığı yok', { csrfHeader: null }],
    ['CSRF çerezi yok', { csrfCookie: null }],
    ['CSRF uyuşmuyor', { csrfHeader: 'B'.repeat(43) }],
  ])('%s → 403, oturum oluşturulmaz', async (_label, options) => {
    const response = await POST(request(options));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('gövde doğrulaması: idToken yoksa 400', async () => {
    const response = await POST(request({ body: {} }));
    expect(response.status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([
    ['REAUTH_REQUIRED', 401],
    ['UNAUTHENTICATED', 401],
    ['ACCOUNT_SUSPENDED', 403],
  ] as const)('%s → %i, çerez yazılmaz', async (code, status) => {
    createSession.mockResolvedValue(fail(code));
    const response = await POST(request());
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ ok: false, error: code });
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('beklenmeyen hata → 500 INTERNAL (iç ayrıntı sızmaz)', async () => {
    createSession.mockRejectedValue(new Error('db down: secret detail'));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: 'INTERNAL' });
  });
});

describe('DELETE /api/auth/session (çıkış)', () => {
  it('CSRF/Origin geçerse oturumu yok eder', async () => {
    destroySession.mockResolvedValue(undefined);
    const response = await DELETE(request({ method: 'DELETE' }));
    expect(response.status).toBe(200);
    expect(destroySession).toHaveBeenCalledTimes(1);
  });

  it('başka siteden çıkış isteği reddedilir (logout CSRF)', async () => {
    const response = await DELETE(request({ method: 'DELETE', origin: 'https://evil.example' }));
    expect(response.status).toBe(403);
    expect(destroySession).not.toHaveBeenCalled();
  });
});
