import { inspectDatabaseUrl, resolveDirectDatabaseUrl } from '@/lib/db/connection-url';

type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * Seed'in yazacağı adres. Host, pg sürücüsünün kullandığı `pg-connection-string` ile çözülür;
 * `?host=`/`?hostaddr=` ile host'u değiştiren adres her durumda reddedilir (URL'de localhost
 * görünüp uzak sunucuya bağlanmasın).
 */
export const resolveSeedUrl = (env: EnvSource): string => {
  const raw = resolveDirectDatabaseUrl(env);
  if (!raw) throw new Error('DATABASE_URL tanımlı değil.');
  if (env.VERCEL_ENV === 'production') {
    throw new Error('Seed prod ortamında çalıştırılamaz.');
  }
  const info = inspectDatabaseUrl(raw);
  if (!info.ok) throw new Error(`Seed adresi reddedildi: ${info.reason}.`);
  if (!info.local && env.SEED_ALLOW_HOST !== info.host) {
    throw new Error(
      `Yerel olmayan host (${info.host}). Bilerek yazıyorsan SEED_ALLOW_HOST=${info.host} ver.`
    );
  }
  return raw;
};
