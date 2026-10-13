import { parse } from 'pg-connection-string';

/**
 * Bağlantı adresi yardımcıları. `server-only` içermez: prisma.config.ts, seed, test altyapısı
 * ve bakım script'leri (purge) de kullanır.
 */

type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * CLI/bakım işleri için doğrudan (pooler olmayan) URL: `DATABASE_URL_UNPOOLED`, yoksa
 * `DATABASE_URL`. `??` değil `||`: Vercel panelinde ya da `.env`'de boş bırakılmış
 * `DATABASE_URL_UNPOOLED=""` tanımsız sayılmalı, boş string bağlantı adresi değildir.
 */
export const resolveDirectDatabaseUrl = (env: EnvSource): string | undefined =>
  env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || undefined;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Sürücünün (pg → pg-connection-string) gerçekte bağlanacağı host'u çözen sorgu parametreleri.
 * `postgresql://u:p@localhost/db?host=ep-x.neon.tech` URL'de localhost görünür ama pg uzak
 * host'a bağlanır; libpq/Prisma da `host`/`hostaddr` parametresini dikkate alır.
 */
const HOST_OVERRIDE_PARAMS = ['host', 'hostaddr'] as const;

export type DatabaseUrlInfo =
  { ok: true; host: string; local: boolean } | { ok: false; reason: string };

/**
 * Sürücünün gerçekte bağlanacağı host'u döner. Host, `new URL()` ile değil, pg'nin kullandığı
 * `pg-connection-string` `parse()` sonucundan okunur; host'u değiştirebilen sorgu
 * parametreleri (`host`, `hostaddr`) her durumda reddedilir.
 */
export const inspectDatabaseUrl = (raw: string): DatabaseUrlInfo => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'geçerli bir URL değil' };
  }
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    return { ok: false, reason: 'postgresql:// olmalı' };
  }
  const overrides = HOST_OVERRIDE_PARAMS.filter(param => url.searchParams.has(param));
  if (overrides.length > 0) {
    return {
      ok: false,
      reason: `host'u değiştiren sorgu parametresi kabul edilmez (${overrides.join(', ')})`,
    };
  }
  const host = parse(raw).host ?? '';
  return { ok: true, host, local: LOCAL_HOSTS.has(host) };
};

/**
 * Adresin yalnızca yerel Postgres'i gösterdiğini doğrular (testler prod/Neon'a asla
 * bağlanmasın, kararlar K2). Geçerliyse host'u, değilse Türkçe gerekçeyi döner.
 */
export const checkLocalDatabaseUrl = (
  raw: string
): { ok: true; host: string } | { ok: false; reason: string } => {
  const info = inspectDatabaseUrl(raw);
  if (!info.ok) return info;
  if (!info.local) return { ok: false, reason: `yerel olmayan host "${info.host}"` };
  return { ok: true, host: info.host };
};
