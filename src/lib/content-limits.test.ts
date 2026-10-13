import { describe, expect, it } from 'vitest';

import { CONTENT_MAX_CHARS, CONTENT_MAX_CODE_UNITS } from './content-limits';

describe('CONTENT_MAX_CHARS (K11)', () => {
  it('gönderi 1000, yorum 500 grafem', () => {
    expect(CONTENT_MAX_CHARS).toEqual({ post: 1000, comment: 500 });
  });

  it('ham code unit sınırı: gönderi 4000, yorum 2000', () => {
    expect(CONTENT_MAX_CODE_UNITS).toEqual({ post: 4000, comment: 2000 });
  });
});
