'use client';

import type { Auth } from 'firebase/auth';

import { getClientEnv } from '@/lib/env.client';

const APP_NAME = 'borsaliyorum-web';

let authPromise: Promise<Auth> | null = null;

/**
 * Firebase istemci Auth'u, yalnızca giriş/kayıt/çıkış anında yüklenir (dinamik import: SDK
 * sayfa paketine girmez). Kalıcılık `inMemoryPersistence`: istemci oturumu tutulmaz, ID token
 * sunucuya verilip hemen `signOut` edilir; oturumun tek kaynağı `__session` çerezidir
 * (ADR-0001 Karar 5). `onAuthStateChanged` aboneliği YOK.
 */
export const getClientAuth = (locale: string): Promise<Auth> => {
  authPromise ??= (async (): Promise<Auth> => {
    const [{ getApp, getApps, initializeApp }, authModule] = await Promise.all([
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
    const auth = authModule.initializeAuth(app, {
      persistence: authModule.inMemoryPersistence,
      popupRedirectResolver: authModule.browserPopupRedirectResolver,
    });
    if (env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
      authModule.connectAuthEmulator(
        auth,
        `http://${env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`,
        {
          disableWarnings: true,
        }
      );
    }
    return auth;
  })().catch((error: unknown) => {
    // Bir sonraki denemede yeniden kurulabilsin (ör. geçici ağ hatası ile chunk yüklenemedi)
    authPromise = null;
    throw error;
  });
  return authPromise.then(auth => {
    // Doğrulama/şifre e-postaları arayüz dilinde gitsin
    auth.languageCode = locale;
    return auth;
  });
};
