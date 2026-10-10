import 'server-only';

import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';

import { getServerEnv } from '@/lib/env.server';

const APP_NAME = 'borsaliyorum-admin';

/**
 * Firebase Admin SDK (yalnızca sunucu). Emulator modunda (`FIREBASE_AUTH_EMULATOR_HOST`)
 * kimlik bilgisi kullanılmaz; Admin SDK bu değişkeni kendisi okur ve tüm Auth çağrılarını
 * emulator'e yönlendirir. Production'da emulator değişkeni `getServerEnv()` içinde reddedilir.
 */
const createApp = (): App => {
  const env = getServerEnv();
  if (env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: env.FIREBASE_PROJECT_ID }, APP_NAME);
  }
  return initializeApp(
    {
      projectId: env.FIREBASE_PROJECT_ID,
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY,
      }),
    },
    APP_NAME
  );
};

export const getAdminAuth = (): Auth => {
  const app = getApps().some(existing => existing.name === APP_NAME)
    ? getApp(APP_NAME)
    : createApp();
  return getAuth(app);
};
