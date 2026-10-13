import { z } from 'zod';

import { ErrorCode, fail, ok, type Result } from '@/lib/errors';

/**
 * Puan sıralı listelerin (akışın "Popüler" sekmesi) keyset imleci: `(score, createdAt, id)` ve
 * listenin anlık görüntü zamanı `asOf`. Puan yalnızca `asOf` anına kadarki etkileşimlerden
 * hesaplanır: sayfalar arasında gelen yeni beğeni/yorum puanı artıramaz, bu yüzden **atlama
 * olmaz**. Anlık görüntü tam değildir: geri çekilen beğeninin satırı silinir, puan yalnızca
 * düşebilir ve düşen gönderi sonraki sayfada **tekrar** gelebilir; tekrar istemcide ayıklanır
 * (`features/feed/client/pages.ts` `flattenUnique`). Dışarıya `base64url("<score>|<ISO createdAt>|<id>|<ISO asOf>")` olarak çıkar; bozuk
 * imleç ilk sayfaya düşmez, `VALIDATION` döner (`cursor.ts` ile aynı sözleşme).
 */
export type ScoreCursor = {
  readonly score: number;
  readonly createdAt: Date;
  readonly id: number;
  readonly asOf: Date;
};

const MAX_ENCODED_LENGTH = 160;
const ISO = String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z`;
const INT4_MAX = 2_147_483_647;

const toDate = (iso: string): Date | null => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) || date.toISOString() !== iso ? null : date;
};

const decodedSchema = z
  .string()
  .regex(new RegExp(`^(0|[1-9]\\d{0,9})\\|(${ISO})\\|([1-9]\\d{0,9})\\|(${ISO})$`))
  .transform((value, ctx) => {
    const [scoreText = '', createdIso = '', idText = '', asOfIso = ''] = value.split('|');
    const score = Number(scoreText);
    const id = Number(idText);
    const createdAt = toDate(createdIso);
    const asOf = toDate(asOfIso);
    if (createdAt === null || asOf === null || score > INT4_MAX || id > INT4_MAX) {
      ctx.addIssue({ code: 'custom', message: 'out of range' });
      return z.NEVER;
    }
    return { score, createdAt, id, asOf };
  });

export const encodeScoreCursor = (cursor: ScoreCursor): string =>
  Buffer.from(
    `${cursor.score}|${cursor.createdAt.toISOString()}|${cursor.id}|${cursor.asOf.toISOString()}`,
    'utf8'
  ).toString('base64url');

export const decodeScoreCursor = (encoded: string): Result<ScoreCursor> => {
  if (encoded.length === 0 || encoded.length > MAX_ENCODED_LENGTH) {
    return fail(ErrorCode.VALIDATION);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return fail(ErrorCode.VALIDATION);
  const parsed = decodedSchema.safeParse(Buffer.from(encoded, 'base64url').toString('utf8'));
  return parsed.success ? ok(parsed.data) : fail(ErrorCode.VALIDATION);
};
