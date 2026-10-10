import { z } from 'zod';

import { ErrorCode, fail, ok, type Result } from '@/lib/errors';

/**
 * Keyset pagination imleci: `(createdAt, id)` çifti. Dışarıya `base64url("<ISO>|<id>")` olarak
 * çıkar (v2-milestone-1 "Cursor"). Opak tutulur; istemci içeriğine güvenmez, sunucu Zod ile
 * doğrular. Bozuk imleç ilk sayfaya düşmez, `VALIDATION` döner.
 */
export type Cursor = { readonly createdAt: Date; readonly id: number };

const MAX_ENCODED_LENGTH = 128;

const decodedSchema = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\|([1-9]\d{0,9})$/)
  .transform((value, ctx) => {
    const [iso = '', idText = ''] = value.split('|');
    const createdAt = new Date(iso);
    const id = Number(idText);
    // Regex biçimi tutsa da "2026-13-45" gibi takvimde olmayan tarihleri ve int4 dışını ele
    if (Number.isNaN(createdAt.getTime()) || createdAt.toISOString() !== iso) {
      ctx.addIssue({ code: 'custom', message: 'invalid date' });
      return z.NEVER;
    }
    if (id > 2_147_483_647) {
      ctx.addIssue({ code: 'custom', message: 'id out of range' });
      return z.NEVER;
    }
    return { createdAt, id };
  });

export const encodeCursor = (cursor: Cursor): string =>
  Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`, 'utf8').toString('base64url');

export const decodeCursor = (encoded: string): Result<Cursor> => {
  if (encoded.length === 0 || encoded.length > MAX_ENCODED_LENGTH) {
    return fail(ErrorCode.VALIDATION);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return fail(ErrorCode.VALIDATION);
  const parsed = decodedSchema.safeParse(Buffer.from(encoded, 'base64url').toString('utf8'));
  return parsed.success ? ok(parsed.data) : fail(ErrorCode.VALIDATION);
};
