'use client';

import type * as FirebaseAuthModule from 'firebase/auth';
import type { Auth } from 'firebase/auth';

import { getClientEnv } from '@/lib/env.client';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'auth.firebase-client' });

const APP_NAME = 'borsaliyorum-web';

/** `firebase/auth` modülü; popup'ı tıklama anında senkron açabilmek için hazır tutulur. */
export type FirebaseAuthSdk = typeof FirebaseAuthModule;

export type ClientAuth = { readonly auth: Auth; readonly sdk: FirebaseAuthSdk };

let clientPromise: Promise<ClientAuth> | null = null;
let ready: ClientAuth | null = null;

const createClientAuth = async (): Promise<ClientAuth> => {
  const [{ getApp, getApps, initializeApp }, sdk] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const env = getClientEnv();
  const app = getApps().some(existing => existing.name === APP_NAME)
    ? getApp(APP_NAME)
    : initializeApp(
        {
          apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          messagingSenderId: env.NEXT_PUBLIC_MESSAGE_SENDER_ID,
          appId: env.NEXT_PUBLIC_APP_ID,
        },
        APP_NAME
      );
  const auth = sdk.initializeAuth(app, {
    persistence: sdk.inMemoryPersistence,
    popupRedirectResolver: sdk.browserPopupRedirectResolver,
  });
  if (env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
    sdk.connectAuthEmulator(auth, `http://${env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`, {
      disableWarnings: true,
    });
  }
  return { auth, sdk };
};

const withLocale = (client: ClientAuth, locale: string): ClientAuth => {
  // Doğrulama/şifre e-postaları arayüz dilinde gitsin
  client.auth.languageCode = locale;
  return client;
};

/**
 * Firebase istemci Auth'u, yalnızca giriş/kayıt/çıkış anında yüklenir (dinamik import: SDK
 * sayfa paketine girmez). Kalıcılık `inMemoryPersistence`: istemci oturumu tutulmaz, ID token
 * sunucuya verilip hemen `signOut` edilir; oturumun tek kaynağı `__session` çerezidir
 * (ADR-0001 Karar 5). `onAuthStateChanged` aboneliği YOK.
 */
export const loadClientAuth = (locale: string): Promise<ClientAuth> => {
  clientPromise ??= createClientAuth().then(
    client => {
      ready = client;
      return client;
    },
    (error: unknown) => {
      // Bir sonraki denemede yeniden kurulabilsin (ör. geçici ağ hatası ile chunk yüklenemedi)
      clientPromise = null;
      throw error;
    }
  );
  return clientPromise.then(client => withLocale(client, locale));
};

/** Geriye uyum: yalnızca `Auth` gereken yerler için. */
export const getClientAuth = async (locale: string): Promise<Auth> =>
  (await loadClientAuth(locale)).auth;

/**
 * Giriş formu açılınca SDK'yı önceden yükler: Google popup'ı tıklamada `await` olmadan
 * (kullanıcı etkileşimi içinde, senkron) açılabilsin; aksi halde tarayıcı popup'ı engeller.
 * Hata loglanır; tıklamadaki `loadClientAuth` yeniden dener ve kullanıcıya hatayı gösterir.
 */
export const prewarmClientAuth = (locale: string): void => {
  loadClientAuth(locale).catch((error: unknown) =>
    log.warn('firebase auth prewarm failed', { err: error })
  );
};

/** SDK yüklenmişse hemen (senkron) döner; yoksa null. */
export const peekClientAuth = (locale: string): ClientAuth | null =>
  ready ? withLocale(ready, locale) : null;
