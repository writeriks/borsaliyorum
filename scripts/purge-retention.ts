/**
 * Günlük saklama süresi / TTL temizliği:
 *   DB (src/lib/db/retention.ts):
 *   - ContentEvent: content_event_purge(<süre>) — 1–2 yıl dışı reddedilir (varsayılan 2 yıl)
 *   - RateLimitBucket: en uzun pencere + 24 saat
 *   - LinkPreview: expiresAt geçmiş ve hiçbir gönderiye bağlı olmayanlar
 *   - LegalIdentityRetention: purgeAt geçmiş olanlar
 *   Firebase (src/lib/auth/orphan-accounts.ts):
 *   - Onboarding'i 30 günde tamamlamayan hesaplar (Firebase'de var, DB'de User yok)
 *
 *   DATABASE_URL_UNPOOLED=… FIREBASE_PROJECT_ID=… FIREBASE_CLIENT_EMAIL=… FIREBASE_PRIVATE_KEY=… \
 *     npx tsx scripts/purge-retention.ts [--content-event-retention="2 years"] [--dry-run]
 *
 * `--dry-run`: hiçbir şey silinmez. DB adımları (dry-run modları yok) atlanır; Firebase adımı
 * yalnızca silinecek hesap sayısını raporlar. Firebase değişkenleri yoksa Firebase adımı
 * uyarıyla atlanır (DB adımı yine çalışır).
 *
 * GitHub Actions: .github/workflows/purge-retention.yml (her gün). Roller ayrıldığında bu
 * script `app_maintenance` rolüyle çalışır (ADR-0001 "Rol ayrımı").
 */
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Client } from 'pg';

import { createUidLookup, purgeOrphanFirebaseAccounts } from '@/lib/auth/orphan-accounts';
import { resolveDirectDatabaseUrl } from '@/lib/db/connection-url';
import { DEFAULT_CONTENT_EVENT_RETENTION, runRetentionPurge } from '@/lib/db/retention';

const RETENTION_ARG = '--content-event-retention=';
const DRY_RUN_ARG = '--dry-run';

const parseRetention = (argv: readonly string[]): string => {
  const arg = argv.find(value => value.startsWith(RETENTION_ARG));
  return arg ? arg.slice(RETENTION_ARG.length) : DEFAULT_CONTENT_EVENT_RETENTION;
};

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

const purgeFirebaseOrphans = async (client: Client, dryRun: boolean): Promise<unknown> => {
  const config = readFirebaseConfig(process.env);
  if (!config) {
    // GitHub Actions uyarısı: secrets eklenene kadar imha yapılmadığı görünür olsun
    console.log('::warning::Firebase değişkenleri tanımlı değil; yetim hesap imhası atlandı.');
    return { skipped: true };
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
        now: () => new Date(),
      },
      { dryRun }
    );
  } finally {
    await deleteApp(app);
  }
};

const main = async (): Promise<void> => {
  const url = resolveDirectDatabaseUrl(process.env);
  if (!url) throw new Error('DATABASE_URL_UNPOOLED ya da DATABASE_URL tanımlı değil.');
  const argv = process.argv.slice(2);
  const contentEventRetention = parseRetention(argv);
  const dryRun = argv.includes(DRY_RUN_ARG);

  const client = new Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
  await client.connect();
  try {
    const db = dryRun
      ? { skipped: 'dry-run' }
      : await runRetentionPurge(client, { contentEventRetention });
    const firebaseOrphans = await purgeFirebaseOrphans(client, dryRun);
    // Yalnızca sayılar loglanır; kişisel veri (uid, e-posta) yok
    console.log(
      JSON.stringify({ job: 'purge-retention', dryRun, contentEventRetention, db, firebaseOrphans })
    );
  } finally {
    await client.end();
  }
};

main().catch((error: unknown) => {
  console.error('purge-retention başarısız:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
