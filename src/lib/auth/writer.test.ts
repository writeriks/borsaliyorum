import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '@/lib/logger';

import type { SessionState, SessionUser } from './types';
import { resolveWriter, type WriterDeps } from './writer';

const log = (): Logger => {
  const value: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => value,
  };
  return value;
};

const user = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  userId: 7,
  username: 'aysek',
  displayName: 'Ayşe',
  avatarUrl: null,
  email: 'ayse@example.test',
  emailVerified: true,
  legalAcceptanceRequired: false,
  roles: [],
  ...overrides,
});

const authenticated = (overrides: Partial<SessionUser> = {}): SessionState => ({
  status: 'authenticated',
  user: user(overrides),
  firebaseUid: 'uid-7',
  authTime: 1,
});

const deps = (overrides: Partial<WriterDeps> = {}) => ({
  fetchEmailVerified: vi.fn(async () => false),
  markEmailVerified: vi.fn(async () => undefined),
  log: log(),
  ...overrides,
});

describe('resolveWriter (requireWriter çekirdeği)', () => {
  it('anonim → UNAUTHENTICATED; onboarding eksik → ONBOARDING_REQUIRED (Firebase çağrısı yok)', async () => {
    const d = deps();
    expect(await resolveWriter({ status: 'anonymous' }, d)).toEqual({
      ok: false,
      error: 'UNAUTHENTICATED',
    });
    expect(
      await resolveWriter(
        {
          status: 'needs-onboarding',
          authTime: 1,
          identity: {
            firebaseUid: 'u',
            email: 'e@example.test',
            emailVerified: true,
            suggestedDisplayName: null,
            existingUserId: null,
          },
        },
        d
      )
    ).toEqual({ ok: false, error: 'ONBOARDING_REQUIRED' });
    expect(d.fetchEmailVerified).not.toHaveBeenCalled();
  });

  it('doğrulanmış kullanıcı → ok, ağ çağrısı yok', async () => {
    const d = deps();
    expect(await resolveWriter(authenticated(), d)).toEqual({ ok: true, data: user() });
    expect(d.fetchEmailVerified).not.toHaveBeenCalled();
  });

  it('doğrulanmamış, Firebase hâlâ doğrulanmamış diyor → EMAIL_NOT_VERIFIED (tek çağrı)', async () => {
    const d = deps();
    expect(await resolveWriter(authenticated({ emailVerified: false }), d)).toEqual({
      ok: false,
      error: 'EMAIL_NOT_VERIFIED',
    });
    expect(d.fetchEmailVerified).toHaveBeenCalledTimes(1);
    expect(d.fetchEmailVerified).toHaveBeenCalledWith('uid-7');
    expect(d.markEmailVerified).not.toHaveBeenCalled();
  });

  it('bu arada doğrulamış → DB güncellenir, kullanıcı yazabilir', async () => {
    const d = deps({ fetchEmailVerified: vi.fn(async () => true) });
    expect(await resolveWriter(authenticated({ emailVerified: false }), d)).toEqual({
      ok: true,
      data: user({ emailVerified: true }),
    });
    expect(d.markEmailVerified).toHaveBeenCalledWith(7);
  });

  it('Firebase erişilemez → EMAIL_NOT_VERIFIED (fail-closed), loglanır', async () => {
    const d = deps({
      fetchEmailVerified: vi.fn(async () => {
        throw new Error('network');
      }),
    });
    expect(await resolveWriter(authenticated({ emailVerified: false }), d)).toEqual({
      ok: false,
      error: 'EMAIL_NOT_VERIFIED',
    });
    expect(d.log.warn).toHaveBeenCalled();
  });

  it('yasal metin paketi güncel değil → LEGAL_ACCEPTANCE_REQUIRED (yazma kapalı)', async () => {
    const d = deps();
    expect(await resolveWriter(authenticated({ legalAcceptanceRequired: true }), d)).toEqual({
      ok: false,
      error: 'LEGAL_ACCEPTANCE_REQUIRED',
    });
  });

  it('kabul eksikliği e-posta doğrulama tazelemesini engellemez (önce doğrulama yazılır)', async () => {
    const d = deps({ fetchEmailVerified: vi.fn(async () => true) });
    expect(
      await resolveWriter(authenticated({ emailVerified: false, legalAcceptanceRequired: true }), d)
    ).toEqual({ ok: false, error: 'LEGAL_ACCEPTANCE_REQUIRED' });
    expect(d.markEmailVerified).toHaveBeenCalledWith(7);
  });
});
