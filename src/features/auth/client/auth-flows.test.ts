/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ClientAuth } from '@/lib/auth/firebase-client';

const peekClientAuth = vi.fn();
const loadClientAuth = vi.fn();
vi.mock('@/lib/auth/firebase-client', () => ({
  peekClientAuth: (...args: unknown[]) => peekClientAuth(...args),
  loadClientAuth: (...args: unknown[]) => loadClientAuth(...args),
}));
const postSession = vi.fn();
vi.mock('@/lib/auth/session-api', () => ({
  NETWORK_ERROR: 'NETWORK',
  postSession: (...args: unknown[]) => postSession(...args),
}));
const sendEmailVerificationModule = vi.fn();
vi.mock('firebase/auth', () => ({
  sendEmailVerification: (...args: unknown[]) => sendEmailVerificationModule(...args),
}));

const {
  completeGoogleRedirect,
  hasPendingGoogleRedirect,
  sendVerificationFromOpenSession,
  signInWithEmail,
  signInWithGoogle,
} = await import('./auth-flows');

const firebaseError = (code: string): Error & { code: string } =>
  Object.assign(new Error(code), { code });

const fakeUser = { getIdToken: vi.fn(async () => 'id-token'), emailVerified: false };

type FakeSdk = {
  GoogleAuthProvider: new () => { setCustomParameters: (params: object) => void };
  signInWithPopup: ReturnType<typeof vi.fn>;
  signInWithRedirect: ReturnType<typeof vi.fn>;
  getRedirectResult: ReturnType<typeof vi.fn>;
  signInWithEmailAndPassword: ReturnType<typeof vi.fn>;
  sendEmailVerification: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
};

const makeClient = (currentUser: unknown = null): ClientAuth & { sdk: FakeSdk } => {
  const sdk: FakeSdk = {
    GoogleAuthProvider: class {
      setCustomParameters(): void {}
    },
    signInWithPopup: vi.fn(async () => ({ user: fakeUser })),
    signInWithRedirect: vi.fn(async () => undefined),
    getRedirectResult: vi.fn(async () => ({ user: fakeUser })),
    signInWithEmailAndPassword: vi.fn(async () => ({ user: fakeUser })),
    sendEmailVerification: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
  };
  return { auth: { currentUser }, sdk } as unknown as ClientAuth & { sdk: FakeSdk };
};

beforeEach(() => {
  peekClientAuth.mockReset();
  loadClientAuth.mockReset();
  postSession.mockReset();
  postSession.mockResolvedValue({ ok: true, data: { status: 'needs-onboarding' } });
  sendEmailVerificationModule.mockReset();
  window.sessionStorage.clear();
});

describe('Google girişi (popup engeli)', () => {
  it('SDK önceden ısınmışsa signInWithPopup tıklama içinde SENKRON çağrılır', () => {
    const client = makeClient();
    peekClientAuth.mockReturnValue(client);
    void signInWithGoogle('tr');
    // Hiçbir mikro görev beklenmeden: kullanıcı etkileşimi henüz geçerli
    expect(client.sdk.signInWithPopup).toHaveBeenCalledTimes(1);
    expect(loadClientAuth).not.toHaveBeenCalled();
  });

  it('popup engellenirse signInWithRedirect fallback; dönüşte getRedirectResult oturumu kurar', async () => {
    const client = makeClient();
    client.sdk.signInWithPopup.mockRejectedValue(firebaseError('auth/popup-blocked'));
    peekClientAuth.mockReturnValue(client);
    void signInWithGoogle('tr');
    await vi.waitFor(() => expect(client.sdk.signInWithRedirect).toHaveBeenCalledTimes(1));
    expect(hasPendingGoogleRedirect()).toBe(true);

    // Sayfa dönüşü
    const result = await completeGoogleRedirect('tr');
    expect(client.sdk.getRedirectResult).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, session: { status: 'needs-onboarding' } });
    expect(postSession).toHaveBeenCalledWith('id-token');
    expect(hasPendingGoogleRedirect()).toBe(false);
  });

  it('redirect sonucu yoksa sessiz iptal (mesaj yok)', async () => {
    const client = makeClient();
    client.sdk.getRedirectResult.mockResolvedValue(null);
    peekClientAuth.mockReturnValue(client);
    expect(await completeGoogleRedirect('tr')).toEqual({ ok: false, error: null });
    expect(postSession).not.toHaveBeenCalled();
  });

  it('SDK hazır değilse yüklenir, sonra popup açılır', async () => {
    const client = makeClient();
    peekClientAuth.mockReturnValue(null);
    loadClientAuth.mockResolvedValue(client);
    expect(await signInWithGoogle('tr')).toMatchObject({ ok: true });
    expect(client.sdk.signInWithPopup).toHaveBeenCalledTimes(1);
    expect(client.sdk.signOut).toHaveBeenCalled();
  });
});

describe('doğrulama e-postası (özel token yok)', () => {
  it('açık istemci oturumu varsa onunla gönderilir', async () => {
    const client = makeClient(fakeUser);
    peekClientAuth.mockReturnValue(client);
    expect(await sendVerificationFromOpenSession('tr')).toEqual({ ok: true });
    expect(client.sdk.sendEmailVerification).toHaveBeenCalledWith(fakeUser);
  });

  it('istemci oturumu yoksa no-client-session → yeniden giriş akışı', async () => {
    peekClientAuth.mockReturnValue(makeClient(null));
    expect(await sendVerificationFromOpenSession('tr')).toEqual({
      ok: false,
      reason: 'no-client-session',
    });
    peekClientAuth.mockReturnValue(null);
    expect(await sendVerificationFromOpenSession('tr')).toEqual({
      ok: false,
      reason: 'no-client-session',
    });
  });

  it('yeniden girişte afterAuthenticate istemci oturumu kapanmadan çalışır', async () => {
    const client = makeClient();
    peekClientAuth.mockReturnValue(client);
    const order: string[] = [];
    client.sdk.signOut.mockImplementation(async () => {
      order.push('signOut');
    });
    await signInWithEmail('tr', 'a@example.test', 'sifre-123', async user => {
      expect(user).toBe(fakeUser);
      order.push('after');
    });
    expect(order).toEqual(['after', 'signOut']);
  });
});
