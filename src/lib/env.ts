import { z } from 'zod';

/**
 * Ortam değişkeni şemaları. Adlar v1 ile aynıdır (Vercel'de zaten tanımlı).
 *
 * Bu modül yan etkisizdir ve `server-only` içermez; çünkü `next.config.ts` build sırasında
 * düz Node'da `assertBuildEnv`'i çağırır. Uygulama kodu doğrudan bunu değil,
 * `env.server.ts` / `env.client.ts` erişimcilerini kullanır.
 */

type EnvSource = Readonly<Record<string, string | undefined>>;

const required = z.string().trim().min(1, 'boş olamaz');
// Vercel panelinde boş bırakılmış değer "tanımsız" sayılır
const optional = z.preprocess(value => (value === '' ? undefined : value), required.optional());

export const serverEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: 'postgresql:// URL olmalı' }),
  FIREBASE_PROJECT_ID: required,
  FIREBASE_CLIENT_EMAIL: z.email({ error: 'geçerli bir servis hesabı e-postası olmalı' }),
  FIREBASE_PRIVATE_KEY: required
    .refine(key => key.includes('PRIVATE KEY'), 'PEM biçiminde özel anahtar olmalı')
    // Vercel/.env satır sonlarını "\n" kaçışı olarak saklar
    .transform(key => key.replace(/\\n/g, '\n')),
  FIREBASE_STORAGE_BUCKET: required,
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

  constructor(scope: 'server' | 'client', issues: readonly string[]) {
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
  scope: 'server' | 'client',
  source: EnvSource
): z.infer<T> => {
  const result = schema.safeParse(source);
  if (!result.success) throw new EnvValidationError(scope, describeIssues(result.error));
  return result.data;
};

export const parseServerEnv = (source: EnvSource): ServerEnv =>
  parseWith(serverEnvSchema, 'server', source);

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
  if (issues.length > 0) throw new EnvValidationError('server', issues);
  return { skipped: false };
};
