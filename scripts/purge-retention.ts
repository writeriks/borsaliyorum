/**
 * Günlük saklama süresi / TTL temizliği:
 *   DB (src/lib/db/retention.ts):
 *   - ContentEvent: content_event_purge(<süre>) — 1–2 yıl dışı reddedilir (varsayılan 2 yıl)
 *   - RateLimitBucket: en uzun pencere + 24 saat
 *   - LinkPreview: expiresAt geçmiş ve hiçbir gönderiye bağlı olmayanlar
 *   - LegalIdentityRetention: purgeAt geçmiş olanlar
 *   - ConsentEvent: consent_event_purge('3 years') — izin sona erdikten 3 yıl sonra
 *   Firebase (src/lib/auth/orphan-accounts.ts):
 *   - Onboarding'i 30 günde tamamlamayan hesaplar (Firebase'de var, DB'de User yok)
 *
 *   DATABASE_URL_UNPOOLED=… FIREBASE_PROJECT_ID=… FIREBASE_CLIENT_EMAIL=… FIREBASE_PRIVATE_KEY=… \
 *     npx tsx scripts/purge-retention.ts [--execute] [--only=db|firebase] \
 *       [--content-event-retention="2 years"]
 *
 * VARSAYILAN DRY-RUN: `--execute` verilmeden hiçbir şey silinmez (DB adımları atlanır, Firebase
 * adımı yalnızca sayar). Firebase hesapları ayrıca `ORPHAN_PURGE_ENABLED=true` olmadan silinmez.
 * Firebase adımının frenleri (ortam etiketi, boş User tablosu, sayfa oranı, koşu başına 200)
 * ve silme hataları süreci 1 ile bitirir. Firebase değişkenleri yoksa adım uyarıyla atlanır.
 *
 * GitHub Actions: .github/workflows/purge-retention.yml. Roller ayrıldığında bu script
 * `app_maintenance` rolüyle çalışır (ADR-0001 "Rol ayrımı", "Yetim hesap imhası").
 */
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Client } from 'pg';

import {
  createEnvironmentReader,
  createUidLookup,
  createUserCounter,
  OrphanPurgeAbortError,
  purgeOrphanFirebaseAccounts,
} from '@/lib/auth/orphan-accounts';
import { resolveDirectDatabaseUrl } from '@/lib/db/connection-url';
import {
  type FirebaseStepResult,
  type PurgeOptions,
  purgeExitCode,
  resolvePurgeOptions,
} from '@/lib/db/purge-options';
import { runRetentionPurge } from '@/lib/db/retention';

type FirebaseConfig = { projectId: string; clientEmail?: string; privateKey?: string };

/** Emulator'de (yalnızca yerel deneme) kimlik bilgisi gerekmez; Admin SDK adresi env'den okur. */
const readFirebaseConfig = (env: NodeJS.ProcessEnv): FirebaseConfig | null => {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) return null;
  if (env.FIREBASE_AUTH_EMULATOR_HOST) return { projectId };
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const purgeFirebaseOrphans = async (
  client: Client,
  options: PurgeOptions
): Promise<FirebaseStepResult & Record<string, unknown>> => {
  const config = readFirebaseConfig(process.env);
  if (!config) {
    // GitHub Actions uyarısı: secrets eklenene kadar imha yapılmadığı görünür olsun
    console.log('::warning::Firebase değişkenleri tanımlı değil; yetim hesap imhası atlandı.');
    return { skipped: true };
  }
  if (options.execute && !options.firebaseDelete) {
    console.log('::notice::ORPHAN_PURGE_ENABLED=true değil; Firebase adımı yalnızca sayıyor.');
  }
  const app = initializeApp(
    config.clientEmail && config.privateKey
      ? {
          projectId: config.projectId,
          credential: cert({
            projectId: config.projectId,
            clientEmail: config.clientEmail,
            privateKey: config.privateKey,
          }),
        }
      : { projectId: config.projectId },
    'purge-retention'
  );
  try {
    const auth = getAuth(app);
    return await purgeOrphanFirebaseAccounts(
      {
        listUsers: (maxResults, pageToken) => auth.listUsers(maxResults, pageToken),
        deleteUsers: uids => auth.deleteUsers(uids),
        findUidsWithUser: createUidLookup(client),
        countUsers: createUserCounter(client),
        readEnvironmentProjectId: createEnvironmentReader(client),
        sleep,
        now: () => new Date(),
      },
      { dryRun: !options.firebaseDelete, expectedProjectId: config.projectId }
    );
  } catch (error) {
    if (error instanceof OrphanPurgeAbortError) {
      console.log(`::error::Yetim hesap imhası durduruldu (${error.reason}): ${error.message}`);
      return { aborted: error.reason };
    }
    throw error;
  } finally {
    await deleteApp(app);
  }
};

const main = async (): Promise<void> => {
  const options = resolvePurgeOptions(process.argv.slice(2), process.env);
  const url = resolveDirectDatabaseUrl(process.env);
  if (!url) throw new Error('DATABASE_URL_UNPOOLED ya da DATABASE_URL tanımlı değil.');

  const client = new Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
  await client.connect();
  try {
    const db = !options.steps.includes('db')
      ? undefined
      : options.execute
        ? await runRetentionPurge(client, {
            contentEventRetention: options.contentEventRetention,
          })
        : { skipped: 'dry-run' };
    const firebase = options.steps.includes('firebase')
      ? await purgeFirebaseOrphans(client, options)
      : undefined;
    // Yalnızca sayılar loglanır; kişisel veri (uid, e-posta) yok
    console.log(
      JSON.stringify({
        job: 'purge-retention',
        execute: options.execute,
        firebaseDelete: options.firebaseDelete,
        contentEventRetention: options.contentEventRetention,
        db,
        firebase,
      })
    );
    process.exitCode = purgeExitCode(firebase ? { firebase } : {});
  } finally {
    await client.end();
  }
};

main().catch((error: unknown) => {
  console.error('purge-retention başarısız:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
