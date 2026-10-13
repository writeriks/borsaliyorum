import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { createLogger, type Logger, type LogLevel, type LogThreshold } from './logger';
import { classifyKey, maskEmails, maskIp, maskText, REDACTED } from './mask';

type Line = { level: LogLevel; record: Record<string, unknown> };

const capture = (level: LogThreshold = 'debug'): { lines: Line[]; log: Logger } => {
  const lines: Line[] = [];
  const log = createLogger({
    level,
    now: () => new Date('2026-10-10T12:00:00.000Z'),
    sink: (lvl, line) => lines.push({ level: lvl, record: JSON.parse(line) }),
  });
  return { lines, log };
};

describe('maskEmails', () => {
  it('yerel kısmı ilk harf dışında gizler, metindeki tüm adresleri maskeler', () => {
    expect(maskEmails('kullanıcı ali.veli@example.com ve x@test.org')).toBe(
      'kullanıcı a***@example.com ve x***@test.org'
    );
  });

  it('özellik: çıktıda orijinal yerel kısım (2+ karakter) kalmaz ve işlem idempotent', () => {
    const local = fc.stringMatching(/^[a-z0-9._-]{2,20}$/);
    const domain = fc.stringMatching(/^[a-z0-9-]{1,10}\.(com|org|net|tr)$/);
    fc.assert(
      fc.property(local, domain, (l, d) => {
        const masked = maskEmails(`önce ${l}@${d} sonra`);
        expect(masked).not.toContain(`${l}@`);
        expect(maskEmails(masked)).toBe(masked);
      })
    );
  });
});

describe('maskIp', () => {
  it.each([
    ['203.0.113.42', '203.0.113.0'],
    ['2001:db8:85a3:8d3:1319:8a2e:370:7348', '2001:db8:85a3::'],
    ['2001:db8::1', '2001:db8::'],
    ['203.0.113.42, 10.0.0.7', '203.0.113.0, 10.0.0.0'],
    ['bilinmeyen', REDACTED],
  ])('%s → %s', (input, expected) => {
    expect(maskIp(input)).toBe(expected);
  });
});

describe('classifyKey', () => {
  it('gizli değer kontrolü e-posta kontrolünden önce gelir (S1 review #1)', () => {
    expect(classifyKey('emailVerificationToken')).toBe('secret');
    expect(classifyKey('emailPassword')).toBe('secret');
    expect(classifyKey('email')).toBe('email');
  });

  it.each([
    'auth',
    'authToken',
    'oauth',
    'authorization',
    'Authorization',
    'jwt',
    'bearer',
    'cookie',
    'set-cookie',
    'sessionCookie',
    'oobCode',
    'phone',
    'phoneNumber',
    'tckn',
  ])('%s tamamen gizlenir', key => {
    expect(classifyKey(key)).toBe('secret');
  });

  it.each(['ip', 'userIp', 'clientIP', 'client_ip', 'x-real-ip', 'x-forwarded-for', 'forwarded'])(
    '%s IP olarak maskelenir',
    key => {
      expect(classifyKey(key)).toBe('ip');
    }
  );

  it.each(['authorId', 'author', 'membership', 'relationship', 'postId', 'zip'])(
    '%s düz alan kalır',
    key => {
      expect(classifyKey(key)).toBe('plain');
    }
  );
});

describe('maskText', () => {
  it.each([
    ['Authorization: Bearer eyJhbGciOi.payload.sig', `Authorization: Bearer ${REDACTED}`],
    ['basic dXNlcjpwYXNz geldi', `basic ${REDACTED} geldi`],
    [
      'https://borsaliyorum.com/__/auth/action?mode=resetPassword&oobCode=ABC123&apiKey=AIza99&lang=tr',
      `https://borsaliyorum.com/__/auth/action?mode=resetPassword&oobCode=${REDACTED}&apiKey=${REDACTED}&lang=tr`,
    ],
    [
      'GET /cb?code=xyz&state=s1#access_token=tok&x=1',
      `GET /cb?code=${REDACTED}&state=s1#access_token=${REDACTED}&x=1`,
    ],
    [
      '/r?token=t1&key=k1&secret=s&password=p',
      `/r?token=${REDACTED}&key=${REDACTED}&secret=${REDACTED}&password=${REDACTED}`,
    ],
    [
      'bağlanamadı: postgresql://neondb_owner:s3cr3t@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require',
      `bağlanamadı: postgresql://${REDACTED}@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require`,
    ],
    ['postgres://admin:p@ss@db.local:5432/app', `postgres://${REDACTED}@db.local:5432/app`],
    ['redis://default@cache.local', `redis://${REDACTED}@cache.local`],
    [
      'ülke /x?countryCode=TR ve https://example.com/ali',
      'ülke /x?countryCode=TR ve https://example.com/ali',
    ],
  ])('%s', (input, expected) => {
    expect(maskText(input)).toBe(expected);
    expect(maskText(expected)).toBe(expected);
  });

  it('bağlantı URL’sinde kullanıcı adı e-posta maskesine kısmen kaçmaz', () => {
    const masked = maskText('postgres://neondb_owner:hunter2@host.example.com/db');
    expect(masked).not.toMatch(/neondb_owner|hunter2|h\*\*\*/);
  });
});

describe('createLogger', () => {
  it('tek satır JSON yazar: level, time, msg ve bağlam', () => {
    const { lines, log } = capture();
    log.info('post created', { postId: 42 });
    expect(lines).toEqual([
      {
        level: 'info',
        record: {
          level: 'info',
          time: '2026-10-10T12:00:00.000Z',
          msg: 'post created',
          postId: 42,
        },
      },
    ]);
  });

  it('kişisel veri ve gizli alanları maskeler (iç içe nesnelerde de)', () => {
    const { lines, log } = capture();
    log.warn('login failed for ali@example.com', {
      email: 'ali@example.com',
      ip: '198.51.100.23',
      headers: { authorization: 'Bearer abc', 'x-forwarded-for': '198.51.100.23, 10.0.0.1' },
      user: { userEmail: 'veli@example.com', idToken: 'eyJ...', password: 'hunter2' },
      note: 'iletişim: ayse@example.com',
    });
    const record = lines[0]?.record;
    expect(record).toMatchObject({
      msg: 'login failed for a***@example.com',
      email: 'a***@example.com',
      ip: '198.51.100.0',
      headers: { authorization: REDACTED, 'x-forwarded-for': '198.51.100.0, 10.0.0.0' },
      user: { userEmail: 'v***@example.com', idToken: REDACTED, password: REDACTED },
      note: 'iletişim: a***@example.com',
    });
    expect(JSON.stringify(record)).not.toMatch(/ali@|veli@|ayse@|hunter2|Bearer abc|\.23\b/);
  });

  it('Error nesnelerini name/message/stack/cause ile serileştirir', () => {
    const { lines, log } = capture();
    const cause = Object.assign(new Error('db down'), { code: 'P1001' });
    log.error('unexpected', { err: new Error('boom for x@y.com', { cause }) });
    const err = lines[0]?.record.err as Record<string, unknown>;
    expect(err).toMatchObject({
      name: 'Error',
      message: 'boom for x***@y.com',
      cause: { message: 'db down', code: 'P1001' },
    });
    expect(typeof err.stack).toBe('string');
  });

  it('döngüsel referansta çökmez', () => {
    const { lines, log } = capture();
    const node: Record<string, unknown> = { name: 'a' };
    node.self = node;
    log.info('cycle', { node });
    expect(lines[0]?.record.node).toEqual({ name: 'a', self: '[Circular]' });
  });

  it('aynı nesne döngüsüz iki kez geçince [Circular] yazmaz (S1 review #3)', () => {
    const { lines, log } = capture();
    const shared = { id: 7 };
    log.info('dup', { a: shared, b: shared, list: [shared, shared], nested: { c: shared } });
    expect(lines[0]?.record).toMatchObject({
      a: { id: 7 },
      b: { id: 7 },
      list: [{ id: 7 }, { id: 7 }],
      nested: { c: { id: 7 } },
    });
  });

  it('aynı Error iki kez geçince ikisi de serileşir', () => {
    const { lines, log } = capture();
    const err = new Error('x');
    log.error('dup', { first: err, second: err });
    expect(lines[0]?.record).toMatchObject({
      first: { message: 'x' },
      second: { message: 'x' },
    });
  });

  it('bağlam ve mesajdaki gizli değerleri değer tarafında da maskeler (S1 review #1-2)', () => {
    const { lines, log } = capture();
    log.error('db fail postgresql://u:pw@h/db', {
      emailVerificationToken: 'tok_abc',
      userIp: '198.51.100.23',
      phone: '+905551112233',
      tckn: '12345678901',
      jwt: 'eyJ.x.y',
      cookie: '__session=abc',
      url: 'https://x.test/a?oobCode=OOB1&lang=tr',
      header: 'Bearer abc.def',
      err: new Error('connect postgres://neondb_owner:pw@ep.neon.tech/db failed'),
    });
    const text = JSON.stringify(lines[0]?.record);
    expect(text).not.toMatch(
      /tok_abc|\.23\b|5551112233|12345678901|eyJ|__session=abc|OOB1|abc\.def|neondb_owner|:pw@/
    );
    expect(lines[0]?.record).toMatchObject({
      emailVerificationToken: REDACTED,
      userIp: '198.51.100.0',
      url: `https://x.test/a?oobCode=${REDACTED}&lang=tr`,
    });
  });

  it('eşik altındaki seviyeleri yazmaz', () => {
    const { lines, log } = capture('warn');
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(lines.map(line => line.level)).toEqual(['warn', 'error']);
  });

  it('child logger sabit alanları taşır, çağrı bağlamı üstüne yazar', () => {
    const { lines, log } = capture();
    log.child({ module: 'feed', requestId: 'r1' }).info('page', { requestId: 'r2', count: 20 });
    expect(lines[0]?.record).toMatchObject({ module: 'feed', requestId: 'r2', count: 20 });
  });
});
