import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { decodeScoreCursor, encodeScoreCursor } from './score-cursor';

const b64 = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');
const ISO = '2026-10-10T12:34:56.789Z';

describe('score cursor', () => {
  it('puan, tarih, kimlik ve anlık görüntü zamanını korur', () => {
    const cursor = {
      score: 7,
      createdAt: new Date(ISO),
      id: 42,
      asOf: new Date('2026-10-11T08:00:00.000Z'),
    };
    const encoded = encodeScoreCursor(cursor);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeScoreCursor(encoded)).toEqual({ ok: true, data: cursor });
  });

  it('her geçerli değer için gidiş-dönüş', () => {
    const date = fc.date({
      min: new Date('2000-01-01'),
      max: new Date('2100-01-01'),
      noInvalidDate: true,
    });
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2_147_483_647 }),
        date,
        fc.integer({ min: 1, max: 2_147_483_647 }),
        date,
        (score, createdAt, id, asOf) => {
          const cursor = { score, createdAt, id, asOf };
          expect(decodeScoreCursor(encodeScoreCursor(cursor))).toEqual({ ok: true, data: cursor });
        }
      )
    );
  });

  it.each([
    ['boş', ''],
    ['base64url değil', 'abc+/='],
    ['düz (createdAt, id) imleci', b64(`${ISO}|1`)],
    ['negatif puan', b64(`-1|${ISO}|1|${ISO}`)],
    ['öndeki sıfır', b64(`01|${ISO}|1|${ISO}`)],
    ['sıfır kimlik', b64(`1|${ISO}|0|${ISO}`)],
    ['int4 üstü puan', b64(`2147483648|${ISO}|1|${ISO}`)],
    ['takvimde olmayan tarih', b64(`1|2026-02-30T12:34:56.789Z|1|${ISO}`)],
    ['eksik asOf', b64(`1|${ISO}|1|`)],
    ['fazla parça', b64(`1|${ISO}|1|${ISO}|x`)],
    ['çok uzun', 'A'.repeat(300)],
  ])('%s → VALIDATION', (_label, input) => {
    expect(decodeScoreCursor(input)).toEqual({ ok: false, error: 'VALIDATION' });
  });
});
