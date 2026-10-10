import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { createLogger, type Logger, type LogLevel, type LogThreshold } from './logger';
import { maskEmails, maskIp, REDACTED } from './mask';

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
