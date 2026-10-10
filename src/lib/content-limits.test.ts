import { describe, expect, it } from 'vitest';

import { CONTENT_MAX_CHARS } from './content-limits';

describe('CONTENT_MAX_CHARS (K11)', () => {
  it('gönderi 1000, yorum 500 grafem', () => {
    expect(CONTENT_MAX_CHARS).toEqual({ post: 1000, comment: 500 });
  });
});
