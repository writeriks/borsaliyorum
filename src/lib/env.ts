import { z } from 'zod';

// Göreli import: next.config.ts bu dosyayı yol takma adları (@/) olmadan derler
import { decodeBase64Key } from './crypto/base64-key';

/**
 * Ortam değişkeni şemaları. Adlar v1 ile aynıdır (Vercel'de zaten tanımlı).
 *
 * Bu modül yan etkisizdir ve `server-only` içermez; çünkü `next.config.ts` build sırasında
 * düz Node'da `assertBuildEnv`'i çağırır. Uygulama kodu doğrudan bunu değil,
 * `env.server.ts` / `env.client.ts` erişimcilerini kullanır.
 */

type EnvSource = Readonly<Record<string, string | undefined>>;
type EnvScope = 'server' | 'client' | 'build';

// Tanımsız değişken, Zod'un genel "expected string" mesajı yerine açıkça söylenir
const message =
  (fallback: string) =>
  (issue: { input?: unknown }): string =>
    issue.input === undefined ? 'tanımlı değil' : fallback;

const required = z
  .string({ error: message('metin olmalı') })
  .trim()
  .min(1, 'boş olamaz');
// Vercel panelinde boş bırakılmış değer "tanımsız" sayılır
const optional = z.preprocess(value => (value === '' ? undefined : value), required.optional());

/**
 * ContentEvent IP şifreleme anahtarı (AES-256-GCM, base64 32 bayt). Şemada opsiyoneldir:
 * secrets'sız build ve testler kırılmasın. Production runtime'da zorunluluğu
 * `parseServerEnv` uygular (bkz. `isProductionRuntime`).
 */
const ipEncryptionKey = z.preprocess(
  value => (value === '' ? undefined : value),
  z
    .string({ error: message('metin olmalı') })
    .trim()
    .transform((value, ctx) => {
      const key = decodeBase64Key(value, 32);
      if (key) return key;
      ctx.addIssue({ code: 'custom', message: 'base64 kodlu 32 bayt olmalı' });
      return z.NEVER;
    })
    .optional()
);

export const serverEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: message('postgresql:// URL olmalı') }),
  FIREBASE_PROJECT_ID: required,
  FIREBASE_CLIENT_EMAIL: z.email({ error: message('geçerli bir servis hesabı e-postası olmalı') }),
  FIREBASE_PRIVATE_KEY: required
    .refine(key => key.includes('PRIVATE KEY'), 'PEM biçiminde özel anahtar olmalı')
    // Vercel/.env satır sonlarını "\n" kaçışı olarak saklar
    .transform(key => key.replace(/\\n/g, '\n')),
  FIREBASE_STORAGE_BUCKET: required,
  IP_ENCRYPTION_KEY: ipEncryptionKey,
  /**
   * Yalnızca test/E2E: Firebase Auth emulator adresi (`127.0.0.1:9099`). Emulator token'ları
   * imzasızdır; production'da set ise uygulama başlamaz (`assertNoAuthEmulatorInProduction`).
   */
  FIREBASE_AUTH_EMULATOR_HOST: optional,
  /** Vercel'in verdiği ortam adı: production | preview | development. */
  VERCEL_ENV: optional,
});

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: required,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: required,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: required,
  NEXT_PUBLIC_MESSAGE_SENDER_ID: required,
  NEXT_PUBLIC_APP_ID: required,
  // v2'de analitik yok; tanımlı olmasa da build kırılmaz
  NEXT_PUBLIC_MEASUREMENT_ID: optional,
  /** Yalnızca E2E build'i: istemci SDK'sı emulator'e bağlanır (`connectAuthEmulator`). */
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: optional,
  // Sitenin kök URL'si (ör. https://borsaliyorum.com); iç linkleri tanımak için (link önizleme)
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    value => (value === '' ? undefined : value),
    z.url({ protocol: /^https?$/, error: message('http(s):// URL olmalı') }).optional()
  ),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

export class EnvValidationError extends Error {
  readonly issues: readonly string[];

  constructor(scope: EnvScope, issues: readonly string[]) {
    super(`Geçersiz ortam değişkenleri (${scope}):\n  - ${issues.join('\n  - ')}`);
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

// Mesaja yalnızca değişken adı ve kural girer; değer (ör. özel anahtar) asla loglanmaz
const describeIssues = (error: z.ZodError): string[] =>
  error.issues.map(issue => `${issue.path.join('.') || '(kök)'}: ${issue.message}`);

const parseWith = <T extends z.ZodType>(
  schema: T,
  scope: Exclude<EnvScope, 'build'>,
  source: EnvSource
): z.infer<T> => {
  const result = schema.safeParse(source);
  if (!result.success) throw new EnvValidationError(scope, describeIssues(result.error));
  return result.data;
};

/**
 * Çalışan production sunucusu mu (Vercel production/preview, `next start`)? `next build`
 * sırasında da NODE_ENV=production'dır; build aşaması (NEXT_PHASE) hariç tutulur ki secrets'sız
 * build kırılmasın.
 */
export const isProductionRuntime = (source: EnvSource): boolean =>
  source.NODE_ENV === 'production' && source.NEXT_PHASE !== 'phase-production-build';

/** Yalnızca production runtime'da zorunlu olan sunucu değişkenleri. */
const PRODUCTION_RUNTIME_REQUIRED = ['IP_ENCRYPTION_KEY'] as const;

/** Emulator'e bağlanmayı sağlayan değişkenler; production'da hiçbiri set olamaz. */
const AUTH_EMULATOR_VARS = [
  'FIREBASE_AUTH_EMULATOR_HOST',
  'NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST',
] as const;

/**
 * Emulator token'ları imzasızdır: production'da emulator değişkeni set ise herkes istediği
 * kullanıcı olarak oturum açabilirdi. Bu yüzden build, sunucu başlangıcı (instrumentation) ve
 * Admin SDK kurulumu bu kontrolü yapar (ADR-0001 Karar 5, ADR-0003 Karar 4).
 */
export const assertNoAuthEmulatorInProduction = (source: EnvSource): void => {
  if (source.VERCEL_ENV !== 'production') return;
  const present = AUTH_EMULATOR_VARS.filter(name => (source[name] ?? '').trim() !== '');
  if (present.length > 0) {
    throw new EnvValidationError(
      'server',
      present.map(name => `${name}: production'da tanımlı olamaz (emulator token'ları imzasız)`)
    );
  }
};

export const parseServerEnv = (source: EnvSource): ServerEnv => {
  assertNoAuthEmulatorInProduction(source);
  const env = parseWith(serverEnvSchema, 'server', source);
  if (isProductionRuntime(source)) {
    const missing = PRODUCTION_RUNTIME_REQUIRED.filter(name => env[name] === undefined);
    if (missing.length > 0) {
      throw new EnvValidationError(
        'server',
        missing.map(name => `${name}: production runtime'da zorunlu`)
      );
    }
  }
  return env;
};

export const parseClientEnv = (source: EnvSource): ClientEnv =>
  parseWith(clientEnvSchema, 'client', source);

/**
 * CI secrets olmadan build alabilsin diye `SKIP_ENV_VALIDATION=1` build kontrolünü atlar.
 * Vercel'de (`VERCEL=1`) bu bayrak yok sayılır: orada eksik env build'i kırmalı.
 */
export const isEnvValidationSkipped = (source: EnvSource): boolean =>
  source.SKIP_ENV_VALIDATION === '1' && source.VERCEL !== '1';

const ipLiteral = z.union([z.ipv4(), z.ipv6()]);

/**
 * `SAFE_FETCH_TEST_ALLOW`: yalnızca testlerde, safeFetch'in politika dışı tutacağı IP'ler
 * (virgülle ayrılmış; ör. yerel test HTTP sunucusu için `127.0.0.1`). Üretim build'inde ya da
 * `NODE_ENV=production` çalışırken tanımlıysa başlangıç hatasıdır: SSRF korumasını kapatır.
 */
export const parseSafeFetchTestAllow = (source: EnvSource): readonly string[] => {
  const raw = source.SAFE_FETCH_TEST_ALLOW?.trim();
  if (!raw) return [];
  if (source.NODE_ENV === 'production') {
    throw new EnvValidationError('server', ['SAFE_FETCH_TEST_ALLOW: üretimde tanımlı olamaz']);
  }
  const entries = raw
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry !== '');
  const invalid = entries.filter(entry => !ipLiteral.safeParse(entry).success);
  if (invalid.length > 0) {
    throw new EnvValidationError('server', ['SAFE_FETCH_TEST_ALLOW: yalnızca IP adresleri']);
  }
  return entries;
};

/** Build anında sunucu ve istemci env'ini birlikte doğrular; hataları tek listede verir. */
export const assertBuildEnv = (source: EnvSource): { skipped: boolean } => {
  // Atlanamaz: E2E build'i (emulator'lü) asla production'a çıkmamalı
  assertNoAuthEmulatorInProduction(source);
  // SKIP_ENV_VALIDATION'dan önce: test allowlist'i hiçbir build'e girmemeli.
  if (source.SAFE_FETCH_TEST_ALLOW?.trim()) {
    throw new EnvValidationError('build', [
      'SAFE_FETCH_TEST_ALLOW: build sırasında tanımlı olamaz',
    ]);
  }
  if (isEnvValidationSkipped(source)) return { skipped: true };

  const issues: string[] = [];
  for (const [scope, schema] of [
    ['server', serverEnvSchema],
    ['client', clientEnvSchema],
  ] as const) {
    const result = schema.safeParse(source);
    if (!result.success) issues.push(...describeIssues(result.error).map(i => `[${scope}] ${i}`));
  }
  if (issues.length > 0) throw new EnvValidationError('build', issues);
  return { skipped: false };
};
