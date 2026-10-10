import { z } from 'zod';

import { decodeBase64Key } from '@/lib/crypto/base64-key';

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
});

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: required,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: required,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: required,
  NEXT_PUBLIC_MESSAGE_SENDER_ID: required,
  NEXT_PUBLIC_APP_ID: required,
  // v2'de analitik yok; tanımlı olmasa da build kırılmaz
  NEXT_PUBLIC_MEASUREMENT_ID: optional,
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

export const parseServerEnv = (source: EnvSource): ServerEnv => {
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

/** Build anında sunucu ve istemci env'ini birlikte doğrular; hataları tek listede verir. */
export const assertBuildEnv = (source: EnvSource): { skipped: boolean } => {
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
