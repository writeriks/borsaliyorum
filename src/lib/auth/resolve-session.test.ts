import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '@/lib/logger';

import { type ResolveSessionDeps, resolveSession, type SessionClaims } from './resolve-session';
import { toClientSession } from './types';
import type { SessionUserRecord } from './user-record';

const NOW_SECONDS = Math.floor(new Date('2026-10-10T12:00:00Z').getTime() / 1000);

const silentLog = (): Logger => {
  const log: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => log,
  };
  return log;
};

const claims = (overrides: Partial<SessionClaims> = {}): SessionClaims => ({
  uid: 'uid-1',
  auth_time: NOW_SECONDS,
  email: 'ayse@example.test',
  email_verified: true,
  ...overrides,
});

const record = (overrides: Partial<SessionUserRecord> = {}): SessionUserRecord => ({
  userId: 7,
  firebaseUserId: 'uid-1',
  username: 'aysek',
  displayName: 'Ayşe Kaya',
  email: 'ayse@example.test',
  profilePhoto: null,
  isEmailVerified: true,
  onboardedAt: new Date('2026-01-01T00:00:00Z'),
  sessionsValidAfter: null,
  status: 'active',
  roles: [],
  ...overrides,
});

const firebaseError = (code: string): Error & { code: string } =>
  Object.assign(new Error(code), { code });

const deps = (
  overrides: Partial<ResolveSessionDeps> = {}
): ResolveSessionDeps & { verifySessionCookie: ReturnType<typeof vi.fn> } => {
  const verifySessionCookie = vi.fn(async () => claims());
  return {
    verifySessionCookie,
    findUserByFirebaseUid: vi.fn(async () => record()),
    log: silentLog(),
    ...overrides,
  } as ResolveSessionDeps & { verifySessionCookie: ReturnType<typeof vi.fn> };
};

describe('resolveSession', () => {
  it('geçerli çerez + onboard edilmiş kullanıcı → authenticated; iptal kontrolü açık (checkRevoked)', async () => {
    const d = deps();
    const session = await resolveSession('cookie', d);
    expect(d.verifySessionCookie).toHaveBeenCalledWith('cookie', true);
    expect(session).toMatchObject({
      status: 'authenticated',
      firebaseUid: 'uid-1',
      user: { userId: 7, username: 'aysek', emailVerified: true },
    });
  });

  it.each([
    'auth/session-cookie-revoked',
    'auth/session-cookie-expired',
    'auth/argument-error',
    'auth/user-disabled',
  ])('%s → anonim, yerel doğrulamaya düşülmez', async code => {
    const verifySessionCookie = vi.fn(async () => {
      throw firebaseError(code);
    });
    const d = deps({ verifySessionCookie });
    expect(await resolveSession('cookie', d)).toEqual({ status: 'anonymous' });
    expect(verifySessionCookie).toHaveBeenCalledTimes(1);
  });

  it('Firebase erişilemezse (ağ) yerel doğrulamaya düşer; kullanıcı çıkış yapmış sayılmaz', async () => {
    const verifySessionCookie = vi.fn(async (_cookie: string, checkRevoked: boolean) => {
      if (checkRevoked) throw firebaseError('app/network-error');
      return claims();
    });
    const d = deps({ verifySessionCookie });
    const session = await resolveSession('cookie', d);
    expect(session.status).toBe('authenticated');
    expect(verifySessionCookie).toHaveBeenLastCalledWith('cookie', false);
    expect(d.log.warn).toHaveBeenCalled();
  });

  it('yerel doğrulamada da sahte/bozuk çerez → anonim', async () => {
    const verifySessionCookie = vi.fn(async (_cookie: string, checkRevoked: boolean) => {
      throw firebaseError(checkRevoked ? 'app/network-error' : 'auth/argument-error');
    });
    expect(await resolveSession('cookie', deps({ verifySessionCookie }))).toEqual({
      status: 'anonymous',
    });
  });

  it('sessionsValidAfter (başka cihazdan çıkış) sonrasında açılmamış oturum → anonim', async () => {
    const d = deps({
      findUserByFirebaseUid: vi.fn(async () =>
        record({ sessionsValidAfter: new Date((NOW_SECONDS + 60) * 1000) })
      ),
    });
    expect(await resolveSession('cookie', d)).toEqual({ status: 'anonymous' });
  });

  it('sessionsValidAfter girişten önceyse oturum geçerli', async () => {
    const d = deps({
      findUserByFirebaseUid: vi.fn(async () =>
        record({ sessionsValidAfter: new Date((NOW_SECONDS - 60) * 1000) })
      ),
    });
    expect((await resolveSession('cookie', d)).status).toBe('authenticated');
  });

  it.each(['suspended', 'deleted'] as const)('status=%s → anonim', async status => {
    const d = deps({ findUserByFirebaseUid: vi.fn(async () => record({ status })) });
    expect(await resolveSession('cookie', d)).toEqual({ status: 'anonymous' });
  });

  it('DB satırı yok (yeni kayıt) → needs-onboarding, placeholder kullanıcı yok', async () => {
    const d = deps({ findUserByFirebaseUid: vi.fn(async () => null) });
    expect(await resolveSession('cookie', d)).toEqual({
      status: 'needs-onboarding',
      authTime: NOW_SECONDS,
      identity: {
        firebaseUid: 'uid-1',
        email: 'ayse@example.test',
        emailVerified: true,
        suggestedDisplayName: null,
        existingUserId: null,
      },
    });
  });

  it('e-posta biçimli adı olan eski hesap (onboardedAt null) → needs-onboarding, mevcut satır bağlanır', async () => {
    const d = deps({
      findUserByFirebaseUid: vi.fn(async () =>
        record({ username: 'ayse@example.test', onboardedAt: null, displayName: 'Ayşe' })
      ),
    });
    const session = await resolveSession('cookie', d);
    expect(session).toMatchObject({
      status: 'needs-onboarding',
      identity: { existingUserId: 7, suggestedDisplayName: 'Ayşe' },
    });
  });

  it('e-postası olmayan Firebase hesabı (telefon) desteklenmez → anonim', async () => {
    const d = deps({
      verifySessionCookie: vi.fn(async () => claims({ email: undefined })),
      findUserByFirebaseUid: vi.fn(async () => null),
    });
    expect(await resolveSession('cookie', d)).toEqual({ status: 'anonymous' });
  });

  it('istemciye giden oturumda firebaseUid, userId ve rol yok; e-posta yalnızca sahibine', async () => {
    const session = await resolveSession(
      'cookie',
      deps({ findUserByFirebaseUid: vi.fn(async () => record({ roles: [{ role: 'admin' }] })) })
    );
    const client = toClientSession(session);
    expect(client).toEqual({
      status: 'authenticated',
      user: {
        username: 'aysek',
        displayName: 'Ayşe Kaya',
        avatarUrl: null,
        email: 'ayse@example.test',
        emailVerified: true,
      },
    });
    expect(JSON.stringify(client)).not.toContain('uid-1');
    expect(JSON.stringify(client)).not.toContain('admin');
    expect(
      toClientSession({
        status: 'needs-onboarding',
        authTime: 1,
        identity: {
          firebaseUid: 'uid-1',
          email: 'a@b.test',
          emailVerified: false,
          suggestedDisplayName: null,
          existingUserId: null,
        },
      })
    ).toEqual({ status: 'needs-onboarding' });
  });
});
