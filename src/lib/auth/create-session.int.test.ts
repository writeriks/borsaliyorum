import { randomBytes, randomUUID } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { decryptIp } from '@/lib/crypto';
import { getDb } from '@/lib/db';
import type { Logger } from '@/lib/logger';
import type { RequestMeta } from '@/lib/request-meta';

import { createUser } from '../../../tests/factories';

import {
  type CreateSessionDeps,
  createSessionFromIdToken,
  type IdTokenClaims,
} from './create-session';

const IP_KEY = new Uint8Array(randomBytes(32));
const NOW = new Date('2026-10-10T12:00:00Z');
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

const log: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: () => log,
};

const meta = (ip: string | null = '203.0.113.7'): RequestMeta => ({
  ip,
  port: null,
  requestId: randomUUID(),
});

const depsFor = (claims: IdTokenClaims, overrides: Partial<CreateSessionDeps> = {}) => {
  const createSessionCookie = vi.fn(async () => `cookie-for-${claims.uid}`);
  const verifyIdToken = vi.fn(async () => claims);
  return {
    verifyIdToken,
    createSessionCookie,
    db: getDb(),
    ipKey: () => IP_KEY,
    now: () => NOW,
    log,
    ...overrides,
  } satisfies CreateSessionDeps;
};

const claimsFor = (uid: string, overrides: Partial<IdTokenClaims> = {}): IdTokenClaims => ({
  uid,
  auth_time: NOW_SECONDS - 5,
  email: `${uid}@example.test`,
  email_verified: true,
  ...overrides,
});

const eventsFor = (userId: number) =>
  getDb().contentEvent.findMany({ where: { actorUserId: userId }, orderBy: { id: 'asc' } });

describe('createSessionFromIdToken (gerçek DB)', () => {
  it('yeni Firebase hesabı: 14 günlük çerez + needs-onboarding; DB satırı oluşturulmaz', async () => {
    const uid = `new-${randomUUID()}`;
    const deps = depsFor(claimsFor(uid));
    const result = await createSessionFromIdToken('id-token', meta(), deps);

    expect(result).toEqual({
      ok: true,
      data: { cookie: `cookie-for-${uid}`, session: { status: 'needs-onboarding' } },
    });
    expect(deps.verifyIdToken).toHaveBeenCalledWith('id-token', true);
    expect(deps.createSessionCookie).toHaveBeenCalledWith('id-token', 14 * 24 * 60 * 60 * 1000);
    expect(await getDb().user.findUnique({ where: { firebaseUserId: uid } })).toBeNull();
  });

  it('mevcut kullanıcı: authenticated, e-posta doğrulama durumu tazelenir, auth.login yazılır (IP şifreli)', async () => {
    const user = await createUser({ isEmailVerified: false });
    const deps = depsFor(claimsFor(user.firebaseUserId, { email_verified: true }));
    const result = await createSessionFromIdToken('id-token', meta('203.0.113.7'), deps);

    expect(result.ok && result.data.session).toEqual({
      status: 'authenticated',
      user: {
        username: user.username,
        displayName: user.displayName,
        avatarUrl: null,
        email: user.email,
        emailVerified: true,
      },
    });
    const updated = await getDb().user.findUniqueOrThrow({ where: { userId: user.userId } });
    expect(updated.isEmailVerified).toBe(true);

    const events = await eventsFor(user.userId);
    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event).toMatchObject({
      action: 'auth_login',
      entityType: 'user',
      entityId: user.userId,
    });
    expect(event?.ipEncrypted).not.toBeNull();
    expect(Buffer.from(event?.ipEncrypted ?? []).toString('utf8')).not.toContain('203.0.113.7');
    expect(decryptIp(event?.ipEncrypted ?? new Uint8Array(), IP_KEY)).toBe('203.0.113.7');
  });

  it("e-posta biçimli eski kullanıcı adına sahip (onboardedAt null) hesap girişte onboarding'e düşer", async () => {
    const user = await createUser({
      username: `legacy-${randomUUID()}@example.test`,
      onboardedAt: null,
    });
    const result = await createSessionFromIdToken(
      'id-token',
      meta(),
      depsFor(claimsFor(user.firebaseUserId))
    );
    expect(result.ok && result.data.session).toEqual({ status: 'needs-onboarding' });
    expect(await eventsFor(user.userId)).toHaveLength(1);
  });

  it('5 dakikadan eski giriş → REAUTH_REQUIRED, çerez üretilmez', async () => {
    const deps = depsFor(claimsFor('stale', { auth_time: NOW_SECONDS - 6 * 60 }));
    expect(await createSessionFromIdToken('id-token', meta(), deps)).toEqual({
      ok: false,
      error: 'REAUTH_REQUIRED',
    });
    expect(deps.createSessionCookie).not.toHaveBeenCalled();
  });

  it('askıdaki hesap → ACCOUNT_SUSPENDED, çerez üretilmez', async () => {
    const user = await createUser({ status: 'suspended' });
    const deps = depsFor(claimsFor(user.firebaseUserId));
    expect(await createSessionFromIdToken('id-token', meta(), deps)).toEqual({
      ok: false,
      error: 'ACCOUNT_SUSPENDED',
    });
    expect(deps.createSessionCookie).not.toHaveBeenCalled();
    expect(await eventsFor(user.userId)).toHaveLength(0);
  });

  it('çıkıştan (sessionsValidAfter) önce alınmış token → REAUTH_REQUIRED', async () => {
    const user = await createUser({ sessionsValidAfter: new Date((NOW_SECONDS + 1) * 1000) });
    const deps = depsFor(claimsFor(user.firebaseUserId));
    expect(await createSessionFromIdToken('id-token', meta(), deps)).toMatchObject({
      ok: false,
      error: 'REAUTH_REQUIRED',
    });
  });

  it('iptal edilmiş/geçersiz ID token → UNAUTHENTICATED', async () => {
    const deps = depsFor(claimsFor('x'), {
      verifyIdToken: vi.fn(async () => {
        throw Object.assign(new Error('revoked'), { code: 'auth/id-token-revoked' });
      }),
    });
    expect(await createSessionFromIdToken('id-token', meta(), deps)).toEqual({
      ok: false,
      error: 'UNAUTHENTICATED',
    });
  });

  it('IP alınamazsa giriş engellenmez ama olay yazılmaz ve hata loglanır', async () => {
    const user = await createUser();
    const result = await createSessionFromIdToken(
      'id-token',
      meta(null),
      depsFor(claimsFor(user.firebaseUserId))
    );
    expect(result.ok).toBe(true);
    expect(await eventsFor(user.userId)).toHaveLength(0);
    expect(log.error).toHaveBeenCalledWith(
      'auth.login event skipped: client IP unavailable',
      expect.anything()
    );
  });
});
