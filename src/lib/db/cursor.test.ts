import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor } from './cursor';

const b64 = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');

describe('cursor', () => {
  it('round-trips createdAt and id', () => {
    const cursor = { createdAt: new Date('2026-10-10T12:34:56.789Z'), id: 42 };
    const encoded = encodeCursor(cursor);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCursor(encoded)).toEqual({ ok: true, data: cursor });
  });

  it('round-trips any valid timestamp/id pair', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2100-01-01'), noInvalidDate: true }),
        fc.integer({ min: 1, max: 2_147_483_647 }),
        (createdAt, id) => {
          const decoded = decodeCursor(encodeCursor({ createdAt, id }));
          expect(decoded).toEqual({ ok: true, data: { createdAt, id } });
        }
      )
    );
  });

  it.each([
    ['empty', ''],
    ['not base64url', 'abc+/='],
    ['garbage payload', b64('hello')],
    ['missing id', b64('2026-10-10T12:34:56.789Z|')],
    ['zero id', b64('2026-10-10T12:34:56.789Z|0')],
    ['negative id', b64('2026-10-10T12:34:56.789Z|-1')],
    ['id above int4', b64('2026-10-10T12:34:56.789Z|2147483648')],
    ['impossible date', b64('2026-02-30T12:34:56.789Z|1')],
    ['non-UTC date', b64('2026-10-10T12:34:56.789+03:00|1')],
    ['extra segment', b64('2026-10-10T12:34:56.789Z|1|2')],
    ['too long', 'A'.repeat(200)],
  ])('rejects %s with VALIDATION', (_label, input) => {
    expect(decodeCursor(input)).toEqual({ ok: false, error: 'VALIDATION' });
  });
});
