import { describe, expect, it } from 'vitest';

import { createPostSchema, deletePostSchema, setPostLikeSchema } from './schemas';

const UUID = '0f8fad5b-d9cb-469f-a165-70867728950e';

const post = {
  text: '$THYAO yükselir',
  sentiment: 'bullish',
  isSponsored: false,
  previewUrl: null,
  clientRequestId: UUID,
};

describe('createPostSchema', () => {
  it('geçerli girdi; previewUrl opsiyonel', () => {
    expect(createPostSchema.safeParse(post).success).toBe(true);
    const { previewUrl: _omitted, ...withoutPreview } = post;
    expect(createPostSchema.safeParse(withoutPreview).success).toBe(true);
  });

  it('grafem sınırını şemada tekrar uygulamaz (1001 karakter şemadan geçer, kural ayrı)', () => {
    expect(createPostSchema.safeParse({ ...post, text: 'a'.repeat(1001) }).success).toBe(true);
  });

  it.each([
    ['uuid olmayan clientRequestId', { clientRequestId: 'abc' }],
    ['bilinmeyen sentiment', { sentiment: 'moon' }],
    ['metin değil', { text: 42 }],
    ['taşıma sınırını aşan metin', { text: 'a'.repeat(50_001) }],
    ['boolean olmayan sponsorluk', { isSponsored: 'true' }],
    ['istemci entity listesi (fazladan alan)', { entities: [] }],
  ])('reddeder: %s', (_name, override) => {
    expect(createPostSchema.safeParse({ ...post, ...override }).success).toBe(false);
  });
});

describe('id şemaları', () => {
  it.each([
    [deletePostSchema, { postId: 1 }, true],
    [deletePostSchema, { postId: 0 }, false],
    [deletePostSchema, { postId: 1.5 }, false],
    [deletePostSchema, { postId: '1' }, false],
    [deletePostSchema, { postId: 2_147_483_648 }, false],
    [setPostLikeSchema, { postId: 3, liked: true }, true],
    [setPostLikeSchema, { postId: 3 }, false],
  ] as const)('%#', (schema, value, expected) => {
    expect(schema.safeParse(value).success).toBe(expected);
  });
});
