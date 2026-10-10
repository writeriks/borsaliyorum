/**
 * Günlük saklama süresi / TTL temizliği (src/lib/db/retention.ts):
 *   - ContentEvent: content_event_purge(<süre>) — 1–2 yıl dışı reddedilir (varsayılan 2 yıl)
 *   - RateLimitBucket: en uzun pencere + 24 saat
 *   - LinkPreview: expiresAt geçmiş ve hiçbir gönderiye bağlı olmayanlar
 *   - LegalIdentityRetention: purgeAt geçmiş olanlar
 *
 *   DATABASE_URL_UNPOOLED=… npx tsx scripts/purge-retention.ts [--content-event-retention="2 years"]
 *
 * GitHub Actions: .github/workflows/purge-retention.yml (her gün). Roller ayrıldığında bu
 * script `app_maintenance` rolüyle çalışır (ADR-0001 "Rol ayrımı").
 */
import { Client } from 'pg';

import { resolveDirectDatabaseUrl } from '@/lib/db/connection-url';
import { DEFAULT_CONTENT_EVENT_RETENTION, runRetentionPurge } from '@/lib/db/retention';

const RETENTION_ARG = '--content-event-retention=';

const parseRetention = (argv: readonly string[]): string => {
  const arg = argv.find(value => value.startsWith(RETENTION_ARG));
  return arg ? arg.slice(RETENTION_ARG.length) : DEFAULT_CONTENT_EVENT_RETENTION;
};

const main = async (): Promise<void> => {
  const url = resolveDirectDatabaseUrl(process.env);
  if (!url) throw new Error('DATABASE_URL_UNPOOLED ya da DATABASE_URL tanımlı değil.');
  const contentEventRetention = parseRetention(process.argv.slice(2));

  const client = new Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
  await client.connect();
  try {
    const summary = await runRetentionPurge(client, { contentEventRetention });
    // Yalnızca sayılar loglanır; kişisel veri yok
    console.log(JSON.stringify({ job: 'purge-retention', contentEventRetention, ...summary }));
  } finally {
    await client.end();
  }
};

main().catch((error: unknown) => {
  console.error('purge-retention başarısız:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
