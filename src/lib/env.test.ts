import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assertBuildEnv,
  clientEnvSchema,
  EnvValidationError,
  isEnvValidationSkipped,
  isProductionRuntime,
  parseClientEnv,
  parseServerEnv,
  serverEnvSchema,
} from './env';

const PRIVATE_KEY_SECRET = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC-super-secret';

const validServer = {
  DATABASE_URL: 'postgresql://user:pass@db.example.com:5432/app?sslmode=require',
  FIREBASE_PROJECT_ID: 'borsaliyorum',
  FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@borsaliyorum.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\\n${PRIVATE_KEY_SECRET}\\n-----END PRIVATE KEY-----\\n`,
  FIREBASE_STORAGE_BUCKET: 'borsaliyorum.appspot.com',
};

const validClient = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'borsaliyorum.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'borsaliyorum',
  NEXT_PUBLIC_MESSAGE_SENDER_ID: '1234567890',
  NEXT_PUBLIC_APP_ID: '1:1234567890:web:abc',
};

const captureError = (fn: () => unknown): EnvValidationError => {
  try {
    fn();
  } catch (error) {
    if (error instanceof EnvValidationError) return error;
    throw error;
  }
  throw new Error('EnvValidationError bekleniyordu');
};

describe('parseServerEnv', () => {
  it('geçerli env değerlerini kabul eder ve özel anahtardaki \\n kaçışlarını çözer', () => {
    const env = parseServerEnv(validServer);
    expect(env.FIREBASE_PRIVATE_KEY).toBe(
      `-----BEGIN PRIVATE KEY-----\n${PRIVATE_KEY_SECRET}\n-----END PRIVATE KEY-----\n`
    );
    expect(env.DATABASE_URL).toBe(validServer.DATABASE_URL);
  });

  it('postgres:// önekini de kabul eder', () => {
    expect(() =>
      parseServerEnv({ ...validServer, DATABASE_URL: 'postgres://u:p@localhost/db' })
    ).not.toThrow();
  });

  it('eksik ve geçersiz değişkenlerin hepsini adıyla raporlar', () => {
    const error = captureError(() =>
      parseServerEnv({
        ...validServer,
        DATABASE_URL: 'mysql://localhost/db',
        FIREBASE_CLIENT_EMAIL: undefined,
        FIREBASE_STORAGE_BUCKET: '   ',
      })
    );
    const failed = error.issues.map(issue => issue.split(':')[0]);
    expect(failed).toEqual(
      expect.arrayContaining(['DATABASE_URL', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_STORAGE_BUCKET'])
    );
  });

  it('PEM olmayan özel anahtarı reddeder ama hata mesajına değeri yazmaz', () => {
    const error = captureError(() =>
      parseServerEnv({ ...validServer, FIREBASE_PRIVATE_KEY: PRIVATE_KEY_SECRET })
    );
    expect(error.issues.some(issue => issue.startsWith('FIREBASE_PRIVATE_KEY'))).toBe(true);
    expect(error.message).not.toContain(PRIVATE_KEY_SECRET);
  });
});

describe('IP_ENCRYPTION_KEY', () => {
  const ipKey = Buffer.alloc(32, 7).toString('base64');

  it('is optional outside production runtime (tests, dev)', () => {
    expect(parseServerEnv(validServer).IP_ENCRYPTION_KEY).toBeUndefined();
    expect(parseServerEnv({ ...validServer, IP_ENCRYPTION_KEY: '' }).IP_ENCRYPTION_KEY).toBe(
      undefined
    );
  });

  it('decodes a base64 32-byte key', () => {
    const env = parseServerEnv({ ...validServer, IP_ENCRYPTION_KEY: ipKey });
    expect(Buffer.from(env.IP_ENCRYPTION_KEY ?? []).equals(Buffer.alloc(32, 7))).toBe(true);
  });

  it('rejects a malformed key without echoing it', () => {
    const bad = Buffer.alloc(16, 9).toString('base64');
    const error = captureError(() => parseServerEnv({ ...validServer, IP_ENCRYPTION_KEY: bad }));
    expect(error.issues).toEqual([
      expect.stringMatching(/^IP_ENCRYPTION_KEY: base64 kodlu 32 bayt/),
    ]);
    expect(error.message).not.toContain(bad);
  });

  it('is required at production runtime', () => {
    const error = captureError(() => parseServerEnv({ ...validServer, NODE_ENV: 'production' }));
    expect(error.issues).toEqual([expect.stringMatching(/^IP_ENCRYPTION_KEY: production runtime/)]);
    expect(() =>
      parseServerEnv({ ...validServer, NODE_ENV: 'production', IP_ENCRYPTION_KEY: ipKey })
    ).not.toThrow();
  });

  it('does not break next build (production build phase) or the build-time check', () => {
    expect(() =>
      parseServerEnv({
        ...validServer,
        NODE_ENV: 'production',
        NEXT_PHASE: 'phase-production-build',
      })
    ).not.toThrow();
    expect(assertBuildEnv({ ...validServer, ...validClient, NODE_ENV: 'production' })).toEqual({
      skipped: false,
    });
    expect(isProductionRuntime({ NODE_ENV: 'development' })).toBe(false);
  });
});

describe('parseClientEnv', () => {
  it('ölçüm kimliği olmadan da geçerlidir; boş string tanımsız sayılır', () => {
    expect(parseClientEnv({ ...validClient, NEXT_PUBLIC_MEASUREMENT_ID: '' })).toEqual(validClient);
  });

  it('zorunlu değişken eksikse hata verir', () => {
    const error = captureError(() =>
      parseClientEnv({ ...validClient, NEXT_PUBLIC_FIREBASE_API_KEY: undefined })
    );
    expect(error.issues).toEqual(['NEXT_PUBLIC_FIREBASE_API_KEY: tanımlı değil']);
  });
});

describe('şema sınırı', () => {
  it('istemci şemasında yalnızca NEXT_PUBLIC_ değişkenleri, sunucu şemasında hiç yok', () => {
    expect(Object.keys(clientEnvSchema.shape).every(key => key.startsWith('NEXT_PUBLIC_'))).toBe(
      true
    );
    expect(Object.keys(serverEnvSchema.shape).some(key => key.startsWith('NEXT_PUBLIC_'))).toBe(
      false
    );
  });
});

describe('isEnvValidationSkipped', () => {
  it.each([
    [{ SKIP_ENV_VALIDATION: '1' }, true],
    [{ SKIP_ENV_VALIDATION: 'true' }, false],
    [{}, false],
    // Vercel'de bayrak yok sayılır: eksik env orada build'i kırmalı
    [{ SKIP_ENV_VALIDATION: '1', VERCEL: '1' }, false],
  ])('%j → %s', (source, expected) => {
    expect(isEnvValidationSkipped(source)).toBe(expected);
  });
});

describe('assertBuildEnv', () => {
  it('her şey tanımlıyken geçer', () => {
    expect(assertBuildEnv({ ...validServer, ...validClient })).toEqual({ skipped: false });
  });

  it('sunucu ve istemci eksiklerini tek hatada toplar', () => {
    const error = captureError(() =>
      assertBuildEnv({ ...validServer, DATABASE_URL: undefined, VERCEL: '1' })
    );
    expect(error.issues).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^\[server\] DATABASE_URL:/),
        expect.stringMatching(/^\[client\] NEXT_PUBLIC_APP_ID:/),
      ])
    );
  });

  it('SKIP_ENV_VALIDATION=1 ile (Vercel dışında) doğrulamayı atlar', () => {
    expect(assertBuildEnv({ SKIP_ENV_VALIDATION: '1' })).toEqual({ skipped: true });
  });

  it("Vercel'de SKIP_ENV_VALIDATION=1 olsa bile eksik env hata verir", () => {
    expect(() => assertBuildEnv({ SKIP_ENV_VALIDATION: '1', VERCEL: '1' })).toThrow(
      EnvValidationError
    );
  });
});

describe('erişimciler', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('getServerEnv process.env’i doğrular', async () => {
    for (const [key, value] of Object.entries(validServer)) vi.stubEnv(key, value);
    const { getServerEnv } = await import('./env.server');
    expect(getServerEnv().FIREBASE_PROJECT_ID).toBe('borsaliyorum');
  });

  it('getServerEnv eksik env’de açık hata fırlatır', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const { getServerEnv } = await import('./env.server');
    // resetModules sonrası sınıf yeniden yüklendiği için instanceof yerine mesaj
    expect(() => getServerEnv()).toThrow(/Geçersiz ortam değişkenleri \(server\)/);
  });

  it('getClientEnv yalnızca NEXT_PUBLIC_ değişkenlerini okur', async () => {
    for (const [key, value] of Object.entries(validClient)) vi.stubEnv(key, value);
    vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ID', 'G-TEST');
    const { getClientEnv } = await import('./env.client');
    expect(getClientEnv()).toEqual({ ...validClient, NEXT_PUBLIC_MEASUREMENT_ID: 'G-TEST' });
  });
});
