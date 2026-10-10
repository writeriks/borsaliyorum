import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDb } from '@/lib/db';

import { createUser } from '../../../tests/factories';

// Sınırlar: çerez deposu (next/headers) ve Firebase Admin. DB gerçek (ADR-0003).
const jar = new Map<string, { value: string; options?: unknown }>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const entry = jar.get(name);
      return entry ? { name, value: entry.value } : undefined;
    },
    set: (name: string, value: string, options?: unknown) => jar.set(name, { value, options }),
  }),
  headers: async () => new Headers(),
}));

const admin = {
  verifySessionCookie: vi.fn(),
  revokeRefreshTokens: vi.fn(),
};
vi.mock('./firebase-admin', () => ({ getAdminAuth: () => admin }));
vi.mock('@/i18n/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: async () => 'tr' }));
vi.mock('@/lib/crypto/key', () => ({ getIpEncryptionKey: () => new Uint8Array(32) }));

const { destroySession, getSession } = await import('./session');

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

beforeEach(() => {
  jar.clear();
  admin.verifySessionCookie.mockReset();
  admin.revokeRefreshTokens.mockReset();
});

describe('getSession / destroySession (gerçek DB)', () => {
  it('çerez yoksa Firebase çağrılmadan anonim', async () => {
    expect(await getSession()).toEqual({ status: 'anonymous' });
    expect(admin.verifySessionCookie).not.toHaveBeenCalled();
  });

  it('çıkış: sessionsValidAfter ileri alınır, refresh token iptal, çerez Max-Age=0; aynı çerez artık anonim', async () => {
    const user = await createUser();
    const authTime = nowSeconds() - 120;
    admin.verifySessionCookie.mockResolvedValue({
      uid: user.firebaseUserId,
      auth_time: authTime,
      email: user.email,
    });
    jar.set('__session', { value: 'valid-cookie' });

    const before = await getSession();
    expect(before.status).toBe('authenticated');
    expect(admin.verifySessionCookie).toHaveBeenCalledWith('valid-cookie', true);

    await destroySession();

    const updated = await getDb().user.findUniqueOrThrow({ where: { userId: user.userId } });
    expect(updated.sessionsValidAfter).not.toBeNull();
    expect(updated.sessionsValidAfter?.getMilliseconds()).toBe(0);
    expect(admin.revokeRefreshTokens).toHaveBeenCalledWith(user.firebaseUserId);
    expect(jar.get('__session')).toEqual({
      value: '',
      options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 },
    });

    // Başka cihazda kalan aynı çerez (Firebase iptali henüz görünmese bile) artık geçersiz
    jar.set('__session', { value: 'valid-cookie' });
    expect(await getSession()).toEqual({ status: 'anonymous' });
  });

  it('Firebase iptal çağrısı başarısız olsa da DB işareti ile çıkış etkili', async () => {
    const user = await createUser();
    admin.verifySessionCookie.mockResolvedValue({
      uid: user.firebaseUserId,
      auth_time: nowSeconds() - 60,
      email: user.email,
    });
    admin.revokeRefreshTokens.mockRejectedValue(new Error('network'));
    jar.set('__session', { value: 'cookie' });

    await expect(destroySession()).resolves.toBeUndefined();
    jar.set('__session', { value: 'cookie' });
    expect(await getSession()).toEqual({ status: 'anonymous' });
  });
});
