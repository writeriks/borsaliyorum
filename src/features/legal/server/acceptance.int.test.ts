import { randomBytes } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sessionUserSelect, toSessionUser } from '@/lib/auth/user-record';
import { getDb } from '@/lib/db';
import { fail, ok } from '@/lib/errors';
import {
  COMMUNITY_RULES_VERSION,
  INVESTMENT_DISCLAIMER_VERSION,
  LEGAL_BUNDLE_VERSION,
  TERMS_VERSION,
} from '@/lib/legal/versions';

import { createUser } from '../../../../tests/factories';

import { acceptLegalBundle } from './acceptance';

// --- Server Action sınırları (ADR-0003: next/*, oturum mock'lanır; DB gerçek) ---
const requireActionUser = vi.fn();
vi.mock('@/lib/auth/session', () => ({ requireActionUser: () => requireActionUser() }));
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
vi.mock('next/navigation', () => ({
  redirect: (target: unknown) => {
    throw new RedirectSignal({ raw: target });
  },
}));

const IP_KEY = new Uint8Array(randomBytes(32));
vi.mock('@/lib/crypto/key', () => ({ getIpEncryptionKey: () => IP_KEY }));

const { acceptLegalUpdate } = await import('./actions');

const sessionUserOf = async (userId: number) =>
  toSessionUser(
    await getDb().user.findUniqueOrThrow({ where: { userId }, select: sessionUserSelect })
  );

beforeEach(() => {
  requireActionUser.mockReset();
  revalidatePath.mockReset();
});

describe('yasal metin paketi kabulü (gerçek DB)', () => {
  it('paketi kabul etmemiş kullanıcı yeniden kabul ister; kabulden sonra istemez', async () => {
    const user = await createUser({ legalBundleVersion: null });
    expect((await sessionUserOf(user.userId)).legalAcceptanceRequired).toBe(true);

    const at = new Date('2026-10-20T08:00:00Z');
    await acceptLegalBundle(getDb(), user.userId, at);

    const updated = await getDb().user.findUniqueOrThrow({ where: { userId: user.userId } });
    expect(updated).toMatchObject({
      legalBundleVersion: LEGAL_BUNDLE_VERSION,
      termsVersion: TERMS_VERSION,
      communityRulesVersion: COMMUNITY_RULES_VERSION,
      disclaimerVersion: INVESTMENT_DISCLAIMER_VERSION,
      termsAcceptedAt: at,
    });
    expect((await sessionUserOf(user.userId)).legalAcceptanceRequired).toBe(false);
  });

  it('eski paket sürümü de yeniden kabul ister', async () => {
    const user = await createUser({ legalBundleVersion: '2025-01-v1' });
    expect((await sessionUserOf(user.userId)).legalAcceptanceRequired).toBe(true);
  });
});

describe('acceptLegalUpdate Server Action', () => {
  it('kutu işaretli değilse VALIDATION; oturum bile sorulmaz', async () => {
    expect(await acceptLegalUpdate({ accepted: false, next: null })).toEqual(
      fail('VALIDATION', { fields: ['accepted'] })
    );
    expect(await acceptLegalUpdate({ next: null })).toMatchObject({ error: 'VALIDATION' });
    expect(requireActionUser).not.toHaveBeenCalled();
  });

  it('anonim → UNAUTHENTICATED, DB yazılmaz', async () => {
    requireActionUser.mockResolvedValue(fail('UNAUTHENTICATED'));
    expect(await acceptLegalUpdate({ accepted: true, next: null })).toEqual(
      fail('UNAUTHENTICATED')
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("kabul kaydedilir, layout yeniden doğrulanır, güvenli next'e dönülür", async () => {
    const user = await createUser({ legalBundleVersion: null });
    requireActionUser.mockResolvedValue(ok(await sessionUserOf(user.userId)));

    const thrown = await acceptLegalUpdate({ accepted: true, next: '/akis?sekme=son' }).catch(
      (error: unknown) => error
    );

    expect(thrown).toBeInstanceOf(RedirectSignal);
    expect((thrown as RedirectSignal).target).toEqual({ raw: '/akis?sekme=son' });
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    expect(
      (await getDb().user.findUniqueOrThrow({ where: { userId: user.userId } })).legalBundleVersion
    ).toBe(LEGAL_BUNDLE_VERSION);
  });

  it('açık yönlendirme denemesi yok sayılır → akış', async () => {
    const user = await createUser({ legalBundleVersion: null });
    requireActionUser.mockResolvedValue(ok(await sessionUserOf(user.userId)));
    const thrown = await acceptLegalUpdate({ accepted: true, next: '//evil.example' }).catch(
      (error: unknown) => error
    );
    expect((thrown as RedirectSignal).target).toEqual({ href: '/akis', locale: 'tr' });
  });

  it('hesap başına rate limit', async () => {
    const user = await createUser();
    requireActionUser.mockResolvedValue(ok(await sessionUserOf(user.userId)));
    const results: unknown[] = [];
    for (let i = 0; i < 11; i += 1) {
      results.push(await acceptLegalUpdate({ accepted: true, next: null }).catch(() => 'redirect'));
    }
    expect(results.slice(0, 10).every(r => r === 'redirect')).toBe(true);
    expect(results[10]).toMatchObject({ ok: false, error: 'RATE_LIMITED' });
  });
});
