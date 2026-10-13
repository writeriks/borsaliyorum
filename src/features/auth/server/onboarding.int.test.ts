import { randomBytes, randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OnboardingIdentity } from '@/lib/auth/types';
import { decryptIp } from '@/lib/crypto';
import { getDb } from '@/lib/db';
import { fail, ok } from '@/lib/errors';
import type { Logger } from '@/lib/logger';

import {
  COMMUNITY_RULES_VERSION,
  INVESTMENT_DISCLAIMER_VERSION,
  LEGAL_BUNDLE_VERSION,
  MARKETING_CONSENT_TEXT_VERSION,
  PRIVACY_NOTICE_VERSION,
  TERMS_VERSION,
} from '@/lib/legal/versions';

import { createUser } from '../../../../tests/factories';
import type { OnboardingData } from '../schemas';

import {
  checkUsername,
  completeOnboardingForIdentity,
  emailBelongsToOtherIdentity,
} from './onboarding';

const IP_KEY = new Uint8Array(randomBytes(32));

// --- Server Action sınırları (ADR-0003: next/headers, next/cache ve oturum mock'lanır) ---
const requireActionOnboardingIdentity = vi.fn();
const getSession = vi.fn();
const destroySession = vi.fn(async () => undefined);
const requireWriter = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  requireActionOnboardingIdentity: () => requireActionOnboardingIdentity(),
  getSession: () => getSession(),
  destroySession: () => destroySession(),
  requireWriter: () => requireWriter(),
}));
// Firebase Admin: onboarding öncesi hesabın hâlâ var olduğu kontrol edilir (yetim hesap imhası)
const getFirebaseUser = vi.fn(async (uid: string) => ({ uid }));
vi.mock('@/lib/auth/firebase-admin', () => ({
  getAdminAuth: () => ({ getUser: (uid: string) => getFirebaseUser(uid) }),
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
// Ham yol yönlendirmesi (`next`): yerel öneki zaten içerir, ikinci kez eklenmez
vi.mock('next/navigation', () => ({
  redirect: (target: unknown) => {
    throw new RedirectSignal({ raw: target });
  },
}));
vi.mock('@/lib/crypto/key', () => ({ getIpEncryptionKey: () => IP_KEY }));
// Pazarlama kutusu flag'i (varsayılan kapalı); testler açıp kapatır
const marketingFlag = vi.fn(() => false);
vi.mock('@/lib/env.server', async importOriginal => ({
  ...(await importOriginal<object>()),
  getMarketingConsentEnabled: () => marketingFlag(),
}));

const {
  authorizeVerificationEmail,
  checkUsernameAvailability,
  completeOnboarding,
  refreshEmailVerification,
} = await import('./actions');

const log: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: () => log,
};

const deps = (
  marketingConsentEnabled = true,
  firebaseAccountExists: (uid: string) => Promise<boolean> = async () => true
) => ({
  db: getDb(),
  ipKey: () => IP_KEY,
  now: () => new Date(),
  log,
  marketingConsentEnabled,
  firebaseAccountExists,
});
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
  termsAccepted: true,
  noticeAcknowledged: true,
  marketingOptIn: false,
  next: null,
  ...overrides,
});

beforeEach(() => {
  requireActionOnboardingIdentity.mockReset();
  revalidatePath.mockReset();
  destroySession.mockClear();
  getFirebaseUser.mockReset();
  getFirebaseUser.mockImplementation(async (uid: string) => ({ uid }));
  marketingFlag.mockReturnValue(false);
});

describe('completeOnboardingForIdentity (gerçek DB)', () => {
  it('yeni kayıt: kullanıcı satırı burada oluşur; aydınlatma/koşullar/18+ zamanı yazılır; session.start olayı', async () => {
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
      termsVersion: TERMS_VERSION,
      // Koşullar ile birlikte paketin diğer belgeleri de kabul edilir (yeniden kabul ekranı yok)
      legalBundleVersion: LEGAL_BUNDLE_VERSION,
      communityRulesVersion: COMMUNITY_RULES_VERSION,
      disclaimerVersion: INVESTMENT_DISCLAIMER_VERSION,
      status: 'active',
      birthday: null,
    });
    expect(user.onboardedAt).toBeInstanceOf(Date);
    expect(user.noticeAcknowledgedAt).toBeInstanceOf(Date);
    expect(user.termsAcceptedAt).toBeInstanceOf(Date);
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

  it('pazarlama izni verildiyse metin sürümü ve onay verilen adresle ConsentEvent yazılır', async () => {
    const identity = newIdentity({ emailVerified: true });
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
        address: identity.email,
      }),
    ]);
  });

  it('e-posta doğrulanmamışsa pazarlama izni yazılmaz (adresin sahibi olduğu ispatlanmadı)', async () => {
    const result = await completeOnboardingForIdentity(
      newIdentity({ emailVerified: false }),
      data({ marketingOptIn: true }),
      meta,
      deps()
    );
    expect(result.ok).toBe(true);
    const userId = result.ok ? result.data.userId : -1;
    expect(await getDb().consentEvent.count({ where: { userId } })).toBe(0);
  });

  it('Firebase hesabı silinmişse (yetim imhası) User yazılmaz → UNAUTHENTICATED', async () => {
    const identity = newIdentity();
    const exists = vi.fn(async () => false);
    expect(await completeOnboardingForIdentity(identity, data(), meta, deps(true, exists))).toEqual(
      fail('UNAUTHENTICATED')
    );
    expect(exists).toHaveBeenCalledWith(identity.firebaseUid);
    expect(await getDb().user.count({ where: { firebaseUserId: identity.firebaseUid } })).toBe(0);
  });

  it("Firebase'e ulaşılamazsa User yazılmaz (hata yukarı iletilir)", async () => {
    const identity = newIdentity();
    const exists = vi.fn(async (): Promise<boolean> => {
      throw new Error('firebase down');
    });
    await expect(
      completeOnboardingForIdentity(identity, data(), meta, deps(true, exists))
    ).rejects.toThrow('firebase down');
    expect(await getDb().user.count({ where: { firebaseUserId: identity.firebaseUid } })).toBe(0);
  });

  it('pazarlama kutusu flag ile kapalıyken istemciden gelen true izin sayılmaz', async () => {
    const result = await completeOnboardingForIdentity(
      newIdentity(),
      data({ marketingOptIn: true }),
      meta,
      deps(false)
    );
    expect(result.ok).toBe(true);
    const userId = result.ok ? result.data.userId : -1;
    expect(await getDb().consentEvent.count({ where: { userId } })).toBe(0);
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
    termsAccepted: true,
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

  it('Kullanım Koşulları işaretlenmeden → VALIDATION (fields: termsAccepted)', async () => {
    expect(await completeOnboarding(formInput({ termsAccepted: false }))).toEqual(
      fail('VALIDATION', { fields: ['termsAccepted'] })
    );
    expect(await completeOnboarding(formInput({ termsAccepted: undefined }))).toMatchObject({
      ok: false,
      error: 'VALIDATION',
    });
    expect(requireActionOnboardingIdentity).not.toHaveBeenCalled();
  });

  it('başarıda kabul edilen Koşullar sürümü yazılır; flag kapalıyken pazarlama izni yazılmaz', async () => {
    const identity = newIdentity();
    requireActionOnboardingIdentity.mockResolvedValue(ok(identity));
    await completeOnboarding(formInput({ marketingOptIn: true })).catch(() => undefined);
    const user = await getDb().user.findUniqueOrThrow({
      where: { firebaseUserId: identity.firebaseUid },
    });
    expect(user.termsVersion).toBe(TERMS_VERSION);
    expect(user.termsAcceptedAt).toBeInstanceOf(Date);
    expect(await getDb().consentEvent.count({ where: { userId: user.userId } })).toBe(0);
  });

  it('flag açıkken pazarlama izni adresle yazılır', async () => {
    marketingFlag.mockReturnValue(true);
    const identity = newIdentity({ emailVerified: true });
    requireActionOnboardingIdentity.mockResolvedValue(ok(identity));
    await completeOnboarding(formInput({ marketingOptIn: true })).catch(() => undefined);
    const user = await getDb().user.findUniqueOrThrow({
      where: { firebaseUserId: identity.firebaseUid },
    });
    expect(await getDb().consentEvent.findMany({ where: { userId: user.userId } })).toEqual([
      expect.objectContaining({ granted: true, address: identity.email }),
    ]);
  });

  it('Firebase hesabı yoksa (auth/user-not-found) oturum sonlandırılır, User yazılmaz', async () => {
    const identity = newIdentity();
    requireActionOnboardingIdentity.mockResolvedValue(ok(identity));
    getFirebaseUser.mockRejectedValueOnce(
      Object.assign(new Error('no user'), { code: 'auth/user-not-found' })
    );
    expect(await completeOnboarding(formInput())).toEqual(fail('UNAUTHENTICATED'));
    expect(getFirebaseUser).toHaveBeenCalledWith(identity.firebaseUid);
    expect(destroySession).toHaveBeenCalledOnce();
    expect(await getDb().user.count({ where: { firebaseUserId: identity.firebaseUid } })).toBe(0);
  });

  it('Firebase geçici hatası → INTERNAL; oturum korunur, User yazılmaz', async () => {
    const identity = newIdentity();
    requireActionOnboardingIdentity.mockResolvedValue(ok(identity));
    getFirebaseUser.mockRejectedValueOnce(
      Object.assign(new Error('unavailable'), { code: 'app/network-error' })
    );
    expect(await completeOnboarding(formInput())).toEqual(fail('INTERNAL'));
    expect(destroySession).not.toHaveBeenCalled();
    expect(await getDb().user.count({ where: { firebaseUserId: identity.firebaseUid } })).toBe(0);
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
    expect((error as RedirectSignal).target).toEqual({ raw: '/gonderi/12' });
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    const user = await getDb().user.findUniqueOrThrow({
      where: { firebaseUserId: identity.firebaseUid },
    });
    const [event] = await getDb().contentEvent.findMany({ where: { actorUserId: user.userId } });
    expect(decryptIp(event?.ipEncrypted ?? new Uint8Array(), IP_KEY)).toBe('198.51.100.20');
  });

  it("/en akışı: next '/en/akis' olduğu gibi kullanılır (çift önek /en/en/akis yok)", async () => {
    requireActionOnboardingIdentity.mockResolvedValue(ok(newIdentity()));
    const error = await completeOnboarding(formInput({ next: '/en/akis?sekme=son' })).catch(
      (thrown: unknown) => thrown
    );
    expect((error as RedirectSignal).target).toEqual({ raw: '/en/akis?sekme=son' });
  });

  it('hesap başına rate limit: sınır aşılınca RATE_LIMITED + retryAfter', async () => {
    const taken = uniqueName();
    await createUser({ username: taken });
    requireActionOnboardingIdentity.mockResolvedValue(ok(newIdentity()));
    const results = [];
    for (let i = 0; i < 11; i += 1) {
      results.push(await completeOnboarding(formInput({ username: taken })));
    }
    expect(results.slice(0, 10).every(r => !r.ok && r.error === 'USERNAME_TAKEN')).toBe(true);
    expect(results[10]).toMatchObject({ ok: false, error: 'RATE_LIMITED' });
    expect(results[10]?.ok === false && typeof results[10].meta?.retryAfter).toBe('number');
  });

  it('aynı e-posta başka bir Firebase kimliğinde kayıtlı → ACCOUNT_EMAIL_CONFLICT (takılı ekran yok)', async () => {
    const existing = await createUser();
    requireActionOnboardingIdentity.mockResolvedValue(ok(newIdentity({ email: existing.email })));
    expect(await completeOnboarding(formInput())).toEqual(fail('ACCOUNT_EMAIL_CONFLICT'));
  });

  it('açık yönlendirme denemesi next yok sayılır → akış', async () => {
    requireActionOnboardingIdentity.mockResolvedValue(ok(newIdentity()));
    const error = await completeOnboarding(formInput({ next: '//evil.example' })).catch(
      (thrown: unknown) => thrown
    );
    expect((error as RedirectSignal).target).toEqual({ href: '/akis', locale: 'tr' });
  });
});

describe('checkUsernameAvailability Server Action', () => {
  it('hesap başına rate limit (kullanıcı adı numaralandırması) → RATE_LIMITED', async () => {
    requireActionOnboardingIdentity.mockResolvedValue(ok(newIdentity()));
    const results = [];
    for (let i = 0; i < 61; i += 1) {
      results.push(await checkUsernameAvailability({ username: `aday_${i}` }));
    }
    expect(results.slice(0, 60).every(r => r.ok)).toBe(true);
    expect(results[60]).toMatchObject({ ok: false, error: 'RATE_LIMITED' });
  });
});

describe('authorizeVerificationEmail Server Action (özel token yok)', () => {
  const session = (emailVerified: boolean, firebaseUid = `uid-${randomUUID()}`) => ({
    status: 'authenticated',
    firebaseUid,
    authTime: 1,
    user: {
      userId: 1,
      username: 'u',
      displayName: 'U',
      avatarUrl: null,
      email: 'u@example.test',
      emailVerified,
      legalAcceptanceRequired: false,
      roles: [],
    },
  });

  it('anonim → UNAUTHENTICATED; zaten doğrulanmış → CONFLICT', async () => {
    getSession.mockResolvedValue({ status: 'anonymous' });
    expect(await authorizeVerificationEmail()).toEqual(fail('UNAUTHENTICATED'));
    getSession.mockResolvedValue(session(true));
    expect(await authorizeVerificationEmail()).toEqual(fail('CONFLICT'));
  });

  it('izin verir ama hiçbir token/kimlik bilgisi döndürmez; hesap başına saatte 5', async () => {
    getSession.mockResolvedValue(session(false));
    const results = [];
    for (let i = 0; i < 6; i += 1) results.push(await authorizeVerificationEmail());
    expect(results.slice(0, 5)).toEqual(Array.from({ length: 5 }, () => ok(null)));
    expect(results[5]).toMatchObject({ ok: false, error: 'RATE_LIMITED' });
  });
});

describe('emailBelongsToOtherIdentity (onboarding sayfası formu göstermeden sorar)', () => {
  it('aynı e-posta başka Firebase kimliğinde → true (büyük/küçük harf duyarsız); kendi satırı → false', async () => {
    const existing = await createUser();
    expect(
      await emailBelongsToOtherIdentity(getDb(), {
        email: existing.email.toUpperCase(),
        firebaseUid: 'baska-uid',
      })
    ).toBe(true);
    expect(
      await emailBelongsToOtherIdentity(getDb(), {
        email: existing.email,
        firebaseUid: existing.firebaseUserId,
      })
    ).toBe(false);
    expect(
      await emailBelongsToOtherIdentity(getDb(), {
        email: 'yok@example.test',
        firebaseUid: 'x',
      })
    ).toBe(false);
  });
});

describe('refreshEmailVerification Server Action', () => {
  const unverified = {
    status: 'authenticated',
    firebaseUid: 'uid-r',
    authTime: 1,
    user: {
      userId: 1,
      username: 'u',
      displayName: 'U',
      avatarUrl: null,
      email: 'u@example.test',
      emailVerified: false,
      legalAcceptanceRequired: true,
      roles: [],
    },
  };

  it('yeni koşullar kabul beklerken de doğrulama "doğrulandı" sayılır (yazma kapısı ayrı)', async () => {
    getSession.mockResolvedValue(unverified);
    requireWriter.mockResolvedValue(fail('LEGAL_ACCEPTANCE_REQUIRED'));
    expect(await refreshEmailVerification()).toEqual(ok({ verified: true }));
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('hâlâ doğrulanmamış → verified: false', async () => {
    getSession.mockResolvedValue(unverified);
    requireWriter.mockResolvedValue(fail('EMAIL_NOT_VERIFIED'));
    expect(await refreshEmailVerification()).toEqual(ok({ verified: false }));
  });
});
