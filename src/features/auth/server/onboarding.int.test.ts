import { randomBytes, randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OnboardingIdentity } from '@/lib/auth/types';
import { decryptIp } from '@/lib/crypto';
import { getDb } from '@/lib/db';
import { fail, ok } from '@/lib/errors';
import type { Logger } from '@/lib/logger';

import { createUser } from '../../../../tests/factories';
import { MARKETING_CONSENT_TEXT_VERSION, PRIVACY_NOTICE_VERSION } from '../legal-versions';
import type { OnboardingData } from '../schemas';

import { checkUsername, completeOnboardingForIdentity } from './onboarding';

const IP_KEY = new Uint8Array(randomBytes(32));

// --- Server Action sınırları (ADR-0003: next/headers, next/cache ve oturum mock'lanır) ---
const requireActionOnboardingIdentity = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  requireActionOnboardingIdentity: () => requireActionOnboardingIdentity(),
  getSession: vi.fn(),
}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.20' }),
}));
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock('next-intl/server', () => ({ getLocale: async () => 'tr' }));
class RedirectSignal extends Error {
  constructor(readonly target: unknown) {
    super('NEXT_REDIRECT');
  }
}
vi.mock('@/i18n/navigation', () => ({
  redirect: (target: unknown) => {
    throw new RedirectSignal(target);
  },
}));
vi.mock('@/lib/crypto/key', () => ({ getIpEncryptionKey: () => IP_KEY }));

const { completeOnboarding } = await import('./actions');

const log: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: () => log,
};

const deps = () => ({ db: getDb(), ipKey: () => IP_KEY, now: () => new Date(), log });
const meta = { ip: '203.0.113.7', port: null, requestId: 'req-1' };

const newIdentity = (overrides: Partial<OnboardingIdentity> = {}): OnboardingIdentity => {
  const uid = `uid-${randomUUID()}`;
  return {
    firebaseUid: uid,
    email: `${uid}@example.test`,
    emailVerified: false,
    suggestedDisplayName: null,
    existingUserId: null,
    ...overrides,
  };
};

let counter = 0;
const uniqueName = (): string => {
  counter += 1;
  return `yeni_${counter}_${randomBytes(2).toString('hex')}`;
};

const data = (overrides: Partial<OnboardingData> = {}): OnboardingData => ({
  username: uniqueName(),
  displayName: 'Ayşe Kaya',
  ageConfirmed: true,
  noticeAcknowledged: true,
  marketingOptIn: false,
  next: null,
  ...overrides,
});

beforeEach(() => {
  requireActionOnboardingIdentity.mockReset();
  revalidatePath.mockReset();
});

describe('completeOnboardingForIdentity (gerçek DB)', () => {
  it('yeni kayıt: kullanıcı satırı burada oluşur; aydınlatma/18+ zamanı yazılır; session.start olayı', async () => {
    const identity = newIdentity();
    const input = data();
    const result = await completeOnboardingForIdentity(identity, input, meta, deps());
    expect(result.ok).toBe(true);

    const user = await getDb().user.findUniqueOrThrow({
      where: { firebaseUserId: identity.firebaseUid },
    });
    expect(user).toMatchObject({
      username: input.username,
      displayName: 'Ayşe Kaya',
      email: identity.email,
      isEmailVerified: false,
      noticeVersion: PRIVACY_NOTICE_VERSION,
      status: 'active',
      birthday: null,
    });
    expect(user.onboardedAt).toBeInstanceOf(Date);
    expect(user.noticeAcknowledgedAt).toBeInstanceOf(Date);
    expect(user.ageConfirmedAt).toBeInstanceOf(Date);

    const events = await getDb().contentEvent.findMany({ where: { actorUserId: user.userId } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: 'session_start',
      entityType: 'user',
      requestId: 'req-1',
    });
    expect(decryptIp(events[0]?.ipEncrypted ?? new Uint8Array(), IP_KEY)).toBe('203.0.113.7');

    // Pazarlama kutusu işaretsiz → izin kaydı yok (izin varsayılmaz)
    expect(await getDb().consentEvent.count({ where: { userId: user.userId } })).toBe(0);
  });

  it('pazarlama izni verildiyse metin sürümüyle ConsentEvent yazılır', async () => {
    const identity = newIdentity();
    const result = await completeOnboardingForIdentity(
      identity,
      data({ marketingOptIn: true }),
      meta,
      deps()
    );
    expect(result.ok).toBe(true);
    const userId = result.ok ? result.data.userId : -1;
    expect(await getDb().consentEvent.findMany({ where: { userId } })).toEqual([
      expect.objectContaining({
        kind: 'marketing_email',
        granted: true,
        textVersion: MARKETING_CONSENT_TEXT_VERSION,
        source: 'signup',
      }),
    ]);
  });

  it('rezerve ad → USERNAME_RESERVED, satır oluşmaz', async () => {
    const identity = newIdentity();
    expect(
      await completeOnboardingForIdentity(identity, data({ username: 'admin' }), meta, deps())
    ).toEqual(fail('USERNAME_RESERVED'));
    expect(await getDb().user.count({ where: { firebaseUserId: identity.firebaseUid } })).toBe(0);
  });

  it('kurala uymayan ad → VALIDATION', async () => {
    expect(
      await completeOnboardingForIdentity(newIdentity(), data({ username: 'Ayşe' }), meta, deps())
    ).toMatchObject({ ok: false, error: 'VALIDATION' });
  });

  it('alınmış ad (büyük/küçük harf duyarsız; eski büyük harfli adlar dahil) → USERNAME_TAKEN', async () => {
    const name = uniqueName();
    await createUser({ username: name.toUpperCase() });
    expect(
      await completeOnboardingForIdentity(newIdentity(), data({ username: name }), meta, deps())
    ).toEqual(fail('USERNAME_TAKEN'));
    expect(await checkUsername(getDb(), name, null)).toBe('taken');
  });

  it('eski hesap (e-posta biçimli ad): mevcut satır güncellenir, yeni satır açılmaz', async () => {
    const legacy = await createUser({
      username: `legacy_${randomUUID()}@example.test`,
      onboardedAt: null,
    });
    const identity = newIdentity({
      firebaseUid: legacy.firebaseUserId,
      email: legacy.email,
      existingUserId: legacy.userId,
    });
    const input = data();
    const result = await completeOnboardingForIdentity(identity, input, meta, deps());
    expect(result).toEqual(ok({ userId: legacy.userId, username: input.username }));
    const updated = await getDb().user.findUniqueOrThrow({ where: { userId: legacy.userId } });
    expect(updated.username).toBe(input.username);
    expect(updated.onboardedAt).not.toBeNull();
    expect(await getDb().user.count({ where: { firebaseUserId: legacy.firebaseUserId } })).toBe(1);
  });

  it('eski hesap kendi mevcut adını (kurala uyuyorsa) koruyabilir', async () => {
    const name = uniqueName();
    const legacy = await createUser({ username: name, onboardedAt: null });
    expect(await checkUsername(getDb(), name, legacy.userId)).toBe('available');
  });

  it('çift gönderim: ikinci istek yeni kullanıcı/olay üretmez (CONFLICT)', async () => {
    const identity = newIdentity();
    const first = await completeOnboardingForIdentity(identity, data(), meta, deps());
    expect(first.ok).toBe(true);
    const second = await completeOnboardingForIdentity(identity, data(), meta, deps());
    expect(second).toEqual(fail('CONFLICT'));
    expect(await getDb().user.count({ where: { firebaseUserId: identity.firebaseUid } })).toBe(1);
  });
});

describe('completeOnboarding Server Action', () => {
  const formInput = (overrides: Record<string, unknown> = {}) => ({
    username: uniqueName(),
    displayName: 'Mehmet',
    ageConfirmed: true,
    noticeAcknowledged: true,
    marketingOptIn: false,
    next: '/gonderi/12',
    ...overrides,
  });

  it("anonim → UNAUTHENTICATED (Zod geçse bile DB'ye dokunmaz)", async () => {
    requireActionOnboardingIdentity.mockResolvedValue(fail('UNAUTHENTICATED'));
    expect(await completeOnboarding(formInput())).toEqual(fail('UNAUTHENTICATED'));
  });

  it('18+ ve aydınlatma işaretlenmeden → VALIDATION, kimlik bile sorulmaz', async () => {
    expect(
      await completeOnboarding(formInput({ ageConfirmed: false, noticeAcknowledged: false }))
    ).toMatchObject({ ok: false, error: 'VALIDATION' });
    expect(requireActionOnboardingIdentity).not.toHaveBeenCalled();
  });

  it('rezerve ad şemada yakalanır → USERNAME_RESERVED', async () => {
    expect(await completeOnboarding(formInput({ username: 'Borsaliyorum' }))).toEqual(
      fail('USERNAME_RESERVED')
    );
  });

  it("başarıda revalidate + güvenli next'e sunucu yönlendirmesi; IP istek başlığından", async () => {
    const identity = newIdentity();
    requireActionOnboardingIdentity.mockResolvedValue(ok(identity));
    const error = await completeOnboarding(formInput()).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(RedirectSignal);
    expect((error as RedirectSignal).target).toEqual({ href: '/gonderi/12', locale: 'tr' });
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    const user = await getDb().user.findUniqueOrThrow({
      where: { firebaseUserId: identity.firebaseUid },
    });
    const [event] = await getDb().contentEvent.findMany({ where: { actorUserId: user.userId } });
    expect(decryptIp(event?.ipEncrypted ?? new Uint8Array(), IP_KEY)).toBe('198.51.100.20');
  });

  it('açık yönlendirme denemesi next yok sayılır → akış', async () => {
    requireActionOnboardingIdentity.mockResolvedValue(ok(newIdentity()));
    const error = await completeOnboarding(formInput({ next: '//evil.example' })).catch(
      (thrown: unknown) => thrown
    );
    expect((error as RedirectSignal).target).toEqual({ href: '/akis', locale: 'tr' });
  });
});
