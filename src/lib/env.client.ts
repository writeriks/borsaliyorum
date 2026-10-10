import { parseClientEnv, type ClientEnv } from '@/lib/env';

let cached: ClientEnv | undefined;

/**
 * İstemci env'i. Next yalnızca `process.env.NEXT_PUBLIC_X` biçimindeki **literal** erişimleri
 * bundle'a gömer; bu yüzden her değişken tek tek yazılır (`process.env` nesnesi geçirilemez).
 */
export const getClientEnv = (): ClientEnv => {
  cached ??= parseClientEnv({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_MESSAGE_SENDER_ID: process.env.NEXT_PUBLIC_MESSAGE_SENDER_ID,
    NEXT_PUBLIC_APP_ID: process.env.NEXT_PUBLIC_APP_ID,
    NEXT_PUBLIC_MEASUREMENT_ID: process.env.NEXT_PUBLIC_MEASUREMENT_ID,
  });
  return cached;
};
