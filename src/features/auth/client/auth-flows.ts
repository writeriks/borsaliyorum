'use client';

import type { Auth, UserCredential } from 'firebase/auth';

import { getClientAuth } from '@/lib/auth/firebase-client';
import type { ClientSession } from '@/lib/auth/types';
import { logger } from '@/lib/logger';

import { AuthErrorKey, authErrorKeyFromFirebase, authErrorKeyFromServer } from '../firebase-errors';

import { NETWORK_ERROR, postSession } from '@/lib/auth/session-api';

const log = logger.child({ module: 'auth.flows' });

export type SignedInSession = Exclude<ClientSession, { status: 'anonymous' }>;

/** `error: null` → kullanıcı kendisi iptal etti (popup kapatıldı); mesaj gösterilmez. */
export type AuthFlowResult =
  | { readonly ok: true; readonly session: SignedInSession }
  | { readonly ok: false; readonly error: AuthErrorKey | null };

/**
 * Firebase ile kimlik doğrula → ID token'ı sunucuya ver → istemci Firebase oturumunu kapat.
 * İstemcide oturum tutulmaz (inMemoryPersistence + signOut); tek kaynak `__session` çerezi.
 */
const establish = async (
  locale: string,
  authenticate: (auth: Auth) => Promise<UserCredential>,
  afterAuthenticate?: (credential: UserCredential) => Promise<void>
): Promise<AuthFlowResult> => {
  let auth: Auth;
  try {
    auth = await getClientAuth(locale);
  } catch (error) {
    log.error('firebase auth init failed', { err: error });
    return { ok: false, error: AuthErrorKey.NETWORK };
  }

  try {
    const credential = await authenticate(auth);
    if (afterAuthenticate) await afterAuthenticate(credential);
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
    const { signOut } = await import('firebase/auth');
    await signOut(auth).catch((error: unknown) =>
      log.warn('client signOut failed', { err: error })
    );
  }
};

export const signInWithEmail = async (
  locale: string,
  email: string,
  password: string
): Promise<AuthFlowResult> => {
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  return establish(locale, auth => signInWithEmailAndPassword(auth, email, password));
};

/**
 * Kayıt: hesap oluşturulur ve doğrulama e-postası hemen gönderilir (istemci SDK oturumu yalnızca
 * bu anda açık). E-posta gönderilemezse kayıt yine tamamlanır; kullanıcı sonra yeniden ister.
 */
export const signUpWithEmail = async (
  locale: string,
  email: string,
  password: string
): Promise<AuthFlowResult> => {
  const { createUserWithEmailAndPassword, sendEmailVerification } = await import('firebase/auth');
  return establish(
    locale,
    auth => createUserWithEmailAndPassword(auth, email, password),
    async credential => {
      await sendEmailVerification(credential.user).catch((error: unknown) =>
        log.warn('verification email failed', { err: error })
      );
    }
  );
};

/** Google: popup (redirect akışı üçüncü taraf depolama bölümlemesi yüzünden güvenilmez). */
export const signInWithGoogle = async (locale: string): Promise<AuthFlowResult> => {
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return establish(locale, auth => signInWithPopup(auth, provider));
};

/**
 * Doğrulama e-postasını yeniden gönderir. Sunucu tek kullanımlık özel token verir; istemci onunla
 * kısa süreli oturum açar, e-postayı ister ve hemen kapatır.
 */
export const resendVerificationEmail = async (
  locale: string,
  customToken: string
): Promise<{ ok: true } | { ok: false; error: AuthErrorKey }> => {
  const { sendEmailVerification, signInWithCustomToken, signOut } = await import('firebase/auth');
  let auth: Auth;
  try {
    auth = await getClientAuth(locale);
  } catch (error) {
    log.error('firebase auth init failed', { err: error });
    return { ok: false, error: AuthErrorKey.NETWORK };
  }
  try {
    const credential = await signInWithCustomToken(auth, customToken);
    await sendEmailVerification(credential.user);
    return { ok: true };
  } catch (error) {
    const key = authErrorKeyFromFirebase(error) ?? AuthErrorKey.GENERIC;
    if (key === AuthErrorKey.GENERIC) log.error('resend verification failed', { err: error });
    return { ok: false, error: key };
  } finally {
    await signOut(auth).catch((error: unknown) =>
      log.warn('client signOut failed', { err: error })
    );
  }
};
