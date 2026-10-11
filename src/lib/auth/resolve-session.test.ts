import { describe, expect, it, vi } from 'vitest';

import { LEGAL_BUNDLE_VERSION } from '@/lib/legal/versions';
import type { Logger } from '@/lib/logger';

import {
  type ResolveSessionDeps,
  resolveSession,
  type SessionClaims,
  verifySensitiveSession,
} from './resolve-session';
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
  legalBundleVersion: LEGAL_BUNDLE_VERSION,
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
  it('geçerli çerez + onboard edilmiş kullanıcı → authenticated; her istekte ağ çağrısı yok (checkRevoked=false, ADR-0001)', async () => {
    const d = deps();
    const session = await resolveSession('cookie', d);
    expect(d.verifySessionCookie).toHaveBeenCalledTimes(1);
    expect(d.verifySessionCookie).toHaveBeenCalledWith('cookie', false);
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
    'app/network-error',
  ])('%s → anonim; ikinci (gevşek) doğrulama denemesi yok', async code => {
    const verifySessionCookie = vi.fn(async () => {
      throw firebaseError(code);
    });
    const d = deps({ verifySessionCookie });
    expect(await resolveSession('cookie', d)).toEqual({ status: 'anonymous' });
    expect(verifySessionCookie).toHaveBeenCalledTimes(1);
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
        legalAcceptanceRequired: false,
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

describe('verifySensitiveSession (hassas işlemler: checkRevoked=true + taze giriş)', () => {
  const NOW = new Date(NOW_SECONDS * 1000 + 60_000);

  it('iptal kontrolü açık; taze girişte authenticated döner', async () => {
    const d = deps();
    const result = await verifySensitiveSession('cookie', d, NOW);
    expect(d.verifySessionCookie).toHaveBeenCalledWith('cookie', true);
    expect(result).toMatchObject({ ok: true, data: { status: 'authenticated' } });
  });

  it.each(['auth/session-cookie-revoked', 'app/network-error'])(
    '%s → REAUTH_REQUIRED (yerel doğrulamaya düşmez; fail-closed)',
    async code => {
      const verifySessionCookie = vi.fn(async () => {
        throw firebaseError(code);
      });
      expect(await verifySensitiveSession('cookie', deps({ verifySessionCookie }), NOW)).toEqual({
        ok: false,
        error: 'REAUTH_REQUIRED',
      });
      expect(verifySessionCookie).toHaveBeenCalledTimes(1);
    }
  );

  it('5 dakikadan eski giriş → REAUTH_REQUIRED', async () => {
    const later = new Date(NOW_SECONDS * 1000 + 6 * 60_000);
    expect(await verifySensitiveSession('cookie', deps(), later)).toEqual({
      ok: false,
      error: 'REAUTH_REQUIRED',
    });
  });

  it('sessionsValidAfter / askı DB kontrolleri de uygulanır', async () => {
    const d = deps({ findUserByFirebaseUid: vi.fn(async () => record({ status: 'suspended' })) });
    expect(await verifySensitiveSession('cookie', d, NOW)).toEqual({
      ok: false,
      error: 'UNAUTHENTICATED',
    });
  });

  it('kabul edilen yasal paket güncel değilse oturum "yeniden kabul gerekli" taşır', async () => {
    for (const legalBundleVersion of [null, '2020-01-v1']) {
      const session = await resolveSession(
        'cookie',
        deps({ findUserByFirebaseUid: vi.fn(async () => record({ legalBundleVersion })) })
      );
      expect(session.status === 'authenticated' && session.user.legalAcceptanceRequired).toBe(true);
    }
  });
});
