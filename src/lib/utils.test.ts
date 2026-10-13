import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('çakışan Tailwind sınıflarında sonuncuyu tutar', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('özel yazı ölçeği ile metin rengini ayrı grup sayar', () => {
    expect(cn('text-fg', 'text-post')).toBe('text-fg text-post');
    expect(cn('text-sm', 'text-post')).toBe('text-post');
  });

  it('koşullu sınıfları süzer', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b');
  });
});
