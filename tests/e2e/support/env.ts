/**
 * E2E ortamı (ADR-0003 Karar 4): Firebase Auth emulator (`demo-` projesi → gerçek Firebase'e
 * hiç bağlanmaz, kimlik bilgisi gerekmez) + ayrı yerel Postgres veritabanı. Bu değerler yalnızca
 * E2E build'ine gömülür; production'da emulator değişkeni varsa uygulama başlamaz.
 *
 * Aynı makinede paralel koşular (worktree'ler) çakışmasın diye port ve DB adı env ile
 * değiştirilebilir: E2E_PORT, E2E_AUTH_EMULATOR_PORT, E2E_DATABASE.
 */
import { databaseUrl } from '../../db/config';

export const E2E_PROJECT_ID = 'demo-borsaliyorum';
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const AUTH_EMULATOR_PORT = Number(process.env.E2E_AUTH_EMULATOR_PORT ?? 9099);
export const AUTH_EMULATOR_HOST = `127.0.0.1:${AUTH_EMULATOR_PORT}`;
export const E2E_DATABASE = process.env.E2E_DATABASE ?? 'borsaliyorum_e2e';

export const e2eDatabaseUrl = (): string => databaseUrl(E2E_DATABASE);

/** Yalnızca test: sabit, gizli olmayan IP şifreleme anahtarı (32 bayt). */
export const E2E_IP_ENCRYPTION_KEY = Buffer.from('borsaliyorum-e2e-ip-key-00000000').toString(
  'base64'
);

/** Yalnızca test: `POST /api/revalidate/stocks` paylaşılan secret'ı (gizli değil). */
export const E2E_STOCKS_REVALIDATE_SECRET = 'e2e-stocks-revalidate-secret-0000000000';

/** `next build` + `next start` süreçlerine verilen env (build'e gömülen NEXT_PUBLIC_* dahil). */
export const e2eServerEnv = (): Record<string, string> => ({
  FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
  FIREBASE_PROJECT_ID: E2E_PROJECT_ID,
  // Emulator modunda Admin SDK kimlik bilgisi kullanmaz; şema doğrulaması için sahte değerler
  FIREBASE_CLIENT_EMAIL: `e2e@${E2E_PROJECT_ID}.iam.gserviceaccount.com`,
  FIREBASE_PRIVATE_KEY:
    '-----BEGIN PRIVATE KEY-----\\nE2E-NOT-A-KEY\\n-----END PRIVATE KEY-----\\n',
  FIREBASE_STORAGE_BUCKET: `${E2E_PROJECT_ID}.appspot.com`,
  NEXT_PUBLIC_FIREBASE_API_KEY: 'fake-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${E2E_PROJECT_ID}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: E2E_PROJECT_ID,
  NEXT_PUBLIC_MESSAGE_SENDER_ID: '000000000000',
  NEXT_PUBLIC_APP_ID: '1:000000000000:web:e2e',
  DATABASE_URL: e2eDatabaseUrl(),
  IP_ENCRYPTION_KEY: E2E_IP_ENCRYPTION_KEY,
  STOCKS_REVALIDATE_SECRET: E2E_STOCKS_REVALIDATE_SECRET,
  // Varsayılan (kapalı) davranış test edilir; geliştiricinin kabuğundaki değer sızmasın
  MARKETING_CONSENT_ENABLED: 'false',
  E2E_PORT: String(E2E_PORT),
  NEXT_TELEMETRY_DISABLED: '1',
});
