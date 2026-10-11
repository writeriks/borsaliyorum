import { describe, expect, it } from 'vitest';

import { createCommentSchema, deleteCommentSchema, setCommentLikeSchema } from './schemas';

const UUID = '0f8fad5b-d9cb-469f-a165-70867728950e';

describe('yorum şemaları', () => {
  it('createComment: postId + metin + uuid; grafem sınırı şemada değil', () => {
    expect(
      createCommentSchema.safeParse({ postId: 1, text: 'a'.repeat(501), clientRequestId: UUID })
        .success
    ).toBe(true);
    expect(
      createCommentSchema.safeParse({ postId: 1, text: 'x', clientRequestId: 'tekrar' }).success
    ).toBe(false);
    expect(createCommentSchema.safeParse({ text: 'x', clientRequestId: UUID }).success).toBe(false);
  });

  it.each([
    [deleteCommentSchema, { commentId: 9 }, true],
    [deleteCommentSchema, { commentId: -9 }, false],
    [setCommentLikeSchema, { commentId: 9, liked: false }, true],
    [setCommentLikeSchema, { commentId: 9, liked: 'yes' }, false],
  ] as const)('%#', (schema, value, expected) => {
    expect(schema.safeParse(value).success).toBe(expected);
  });
});
