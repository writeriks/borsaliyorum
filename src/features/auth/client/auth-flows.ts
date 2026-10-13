'use client';

import type { User, UserCredential } from 'firebase/auth';

import { type ClientAuth, loadClientAuth, peekClientAuth } from '@/lib/auth/firebase-client';
import { NETWORK_ERROR, postSession } from '@/lib/auth/session-api';
import type { ClientSession } from '@/lib/auth/types';
import { logger } from '@/lib/logger';

import { AuthErrorKey, authErrorKeyFromFirebase, authErrorKeyFromServer } from '../firebase-errors';

const log = logger.child({ module: 'auth.flows' });

export type SignedInSession = Exclude<ClientSession, { status: 'anonymous' }>;

/** `error: null` → kullanıcı kendisi iptal etti (popup kapatıldı); mesaj gösterilmez. */
export type AuthFlowResult =
  | { readonly ok: true; readonly session: SignedInSession }
  | { readonly ok: false; readonly error: AuthErrorKey | null };

/** Kimlik doğrulandıktan sonra, istemci oturumu kapanmadan çalışır (ör. doğrulama e-postası). */
export type AfterAuthenticate = (user: User) => Promise<void>;

type Authenticate = (client: ClientAuth) => Promise<UserCredential | null>;

/** Google redirect dönüşünü tanımak için (yalnızca bu sekme, oturum boyunca). */
const GOOGLE_REDIRECT_MARKER = 'borsaliyorum:google-redirect';

const readMarker = (): boolean => {
  try {
    return window.sessionStorage.getItem(GOOGLE_REDIRECT_MARKER) === '1';
  } catch (error) {
    log.warn('sessionStorage unavailable', { err: error });
    return false;
  }
};

const writeMarker = (value: boolean): void => {
  try {
    if (value) window.sessionStorage.setItem(GOOGLE_REDIRECT_MARKER, '1');
    else window.sessionStorage.removeItem(GOOGLE_REDIRECT_MARKER);
  } catch (error) {
    log.warn('sessionStorage unavailable', { err: error });
  }
};

/**
 * `authenticate`'i başlatır. SDK hazırsa **senkron** çağrılır: Google popup'ı tıklamanın
 * kullanıcı etkileşimi içinde açılır (araya `await` girerse tarayıcı popup'ı engeller).
 */
const start = (
  locale: string,
  authenticate: Authenticate
): { client: Promise<ClientAuth>; credential: Promise<UserCredential | null> } => {
  const ready = peekClientAuth(locale);
  if (ready) {
    let credential: Promise<UserCredential | null>;
    try {
      credential = authenticate(ready);
    } catch (error) {
      credential = Promise.reject(error);
    }
    return { client: Promise.resolve(ready), credential };
  }
  const client = loadClientAuth(locale);
  return { client, credential: client.then(authenticate) };
};

/**
 * Firebase ile kimlik doğrula → ID token'ı sunucuya ver → istemci Firebase oturumunu kapat.
 * İstemcide oturum tutulmaz (inMemoryPersistence + signOut); tek kaynak `__session` çerezi.
 */
const establish = async (
  locale: string,
  authenticate: Authenticate,
  afterAuthenticate?: AfterAuthenticate
): Promise<AuthFlowResult> => {
  const started = start(locale, authenticate);
  let client: ClientAuth;
  try {
    client = await started.client;
  } catch (error) {
    // `credential` aynı hatayla reddedilir; işlenmemiş ret kalmasın
    started.credential.catch(() => undefined);
    log.error('firebase auth init failed', { err: error });
    return { ok: false, error: AuthErrorKey.NETWORK };
  }

  try {
    const credential = await started.credential;
    if (credential === null) return { ok: false, error: null };
    if (afterAuthenticate) await afterAuthenticate(credential.user);
    const idToken = await credential.user.getIdToken();
    const result = await postSession(idToken);
    if (result.ok) return { ok: true, session: result.data };
    return {
      ok: false,
      error:
        result.error === NETWORK_ERROR
          ? AuthErrorKey.NETWORK
          : authErrorKeyFromServer(result.error),
    };
  } catch (error) {
    const key = authErrorKeyFromFirebase(error);
    if (key === AuthErrorKey.GENERIC) log.error('auth flow failed', { err: error });
    return { ok: false, error: key };
  } finally {
    await client.sdk
      .signOut(client.auth)
      .catch((error: unknown) => log.warn('client signOut failed', { err: error }));
  }
};

export const signInWithEmail = (
  locale: string,
  email: string,
  password: string,
  afterAuthenticate?: AfterAuthenticate
): Promise<AuthFlowResult> =>
  establish(
    locale,
    ({ auth, sdk }) => sdk.signInWithEmailAndPassword(auth, email, password),
    afterAuthenticate
  );

/** Yeniden giriş sırasında doğrulama e-postası (istemci oturumu bu anda açık). */
export const sendVerificationEmail = async (user: User): Promise<void> => {
  const { sendEmailVerification } = await import('firebase/auth');
  await sendEmailVerification(user);
};

/**
 * Kayıt: hesap oluşturulur ve doğrulama e-postası hemen gönderilir (istemci SDK oturumu yalnızca
 * bu anda açık). E-posta gönderilemezse kayıt yine tamamlanır; kullanıcı sonra yeniden ister.
 */
export const signUpWithEmail = (
  locale: string,
  email: string,
  password: string
): Promise<AuthFlowResult> =>
  establish(
    locale,
    ({ auth, sdk }) => sdk.createUserWithEmailAndPassword(auth, email, password),
    user =>
      sendVerificationEmail(user).catch((error: unknown) =>
        log.warn('verification email failed', { err: error })
      )
  );

const POPUP_BLOCKED = 'auth/popup-blocked';

const firebaseCode = (error: unknown): string | null => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
};

/**
 * Google: popup (redirect akışı üçüncü taraf depolama bölümlemesi yüzünden daha az güvenilir,
 * ADR-0001). Popup tıklamada senkron açılır (`start`); tarayıcı yine de engellerse
 * `signInWithRedirect`'e düşülür ve dönüşte `completeGoogleRedirect` akışı tamamlar.
 */
export const signInWithGoogle = (
  locale: string,
  afterAuthenticate?: AfterAuthenticate
): Promise<AuthFlowResult> =>
  establish(
    locale,
    ({ auth, sdk }) => {
      const provider = new sdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      return sdk.signInWithPopup(auth, provider).catch(async (error: unknown) => {
        if (firebaseCode(error) !== POPUP_BLOCKED) throw error;
        log.info('google popup blocked; falling back to redirect');
        writeMarker(true);
        await sdk.signInWithRedirect(auth, provider);
        // Sayfa Google'a gidiyor: buton yüklenme durumunda kalsın
        return new Promise<never>(() => undefined);
      });
    },
    afterAuthenticate
  );

/** Google redirect'inden dönülmüş mü (bu sekmede başlatılmış bir redirect var mı)? */
export const hasPendingGoogleRedirect = (): boolean => readMarker();

/** Redirect dönüşü: Firebase sonucunu alır ve oturumu kurar. Sonuç yoksa sessizce iptal. */
export const completeGoogleRedirect = (locale: string): Promise<AuthFlowResult> => {
  writeMarker(false);
  return establish(locale, ({ auth, sdk }) => sdk.getRedirectResult(auth));
};

export type VerificationSendResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'no-client-session' }
  | { readonly ok: false; readonly reason: 'failed'; readonly error: AuthErrorKey };

/**
 * Doğrulama e-postasını kullanıcının **zaten açık olan** istemci oturumuyla gönderir.
 * İstemci oturumu yoksa (normal durum: giriş sonrası hemen kapatılır) `no-client-session`
 * döner; çağıran "tekrar giriş yap ve gönder" akışına geçer. Sunucudan hiçbir zaman özel
 * token alınmaz.
 */
export const sendVerificationFromOpenSession = async (
  locale: string
): Promise<VerificationSendResult> => {
  const client = peekClientAuth(locale);
  const user = client?.auth.currentUser;
  if (!client || !user) return { ok: false, reason: 'no-client-session' };
  try {
    await client.sdk.sendEmailVerification(user);
    return { ok: true };
  } catch (error) {
    const key = authErrorKeyFromFirebase(error) ?? AuthErrorKey.GENERIC;
    if (key === AuthErrorKey.GENERIC) log.error('send verification failed', { err: error });
    return { ok: false, reason: 'failed', error: key };
  }
};
