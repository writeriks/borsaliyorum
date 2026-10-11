import { describe, expect, it } from 'vitest';

import {
  stockIndexSchema,
  tagSuggestionsSchema,
  userSuggestionsSchema,
} from '@/features/composer/schemas';

import {
  DISPLAY_NAME_MAX,
  toStockIndexItem,
  toTagSuggestion,
  toUserSuggestion,
  truncateUtf16,
  type UserSuggestionRow,
} from './dto';

const AVATAR = 'https://firebasestorage.googleapis.com/v0/b/ornek/o/a.png?alt=media';

describe('toUserSuggestion (PublicUser DTO)', () => {
  it('yalnızca dört alan; e-posta/firebaseUid satırda olsa da çıktıya geçmez', () => {
    const row = {
      username: 'ali_k',
      displayName: 'Ali Kaya',
      profilePhoto: AVATAR,
      following: true,
      email: 'ali@example.test',
      firebaseUserId: 'uid-secret',
      userId: 7,
    } satisfies UserSuggestionRow & Record<string, unknown>;
    const dto = toUserSuggestion(row);
    expect(dto).toEqual({
      username: 'ali_k',
      displayName: 'Ali Kaya',
      avatarUrl: AVATAR,
      following: true,
    });
    expect(Object.keys(dto).sort()).toEqual(['avatarUrl', 'displayName', 'following', 'username']);
    const json = JSON.stringify(dto);
    expect(json).not.toContain('example.test');
    expect(json).not.toContain('uid-secret');
  });

  it.each([
    'https://izleme.ornek.com/p.png',
    'http://firebasestorage.googleapis.com/a.png',
    'javascript:alert(1)',
    'bozuk',
  ])('allowlist dışı avatar (%s) → null', profilePhoto => {
    expect(
      toUserSuggestion({ username: 'a_1', displayName: 'A', profilePhoto, following: false })
        .avatarUrl
    ).toBeNull();
  });

  it('uzun görünen ad istemci şemasına sığacak şekilde kırpılır (vekil çifti bölünmez)', () => {
    const dto = toUserSuggestion({
      username: 'uzun',
      displayName: `${'a'.repeat(DISPLAY_NAME_MAX - 1)}😀😀`,
      profilePhoto: null,
      following: false,
    });
    expect(dto.displayName).toBe('a'.repeat(DISPLAY_NAME_MAX - 1));
    expect(userSuggestionsSchema.safeParse([dto]).success).toBe(true);
  });
});

describe('truncateUtf16', () => {
  it('sınır altında aynen döner, üstünde kırpar', () => {
    expect(truncateUtf16('abc', 3)).toBe('abc');
    expect(truncateUtf16('abcd', 3)).toBe('abc');
    expect(truncateUtf16('a😀', 2)).toBe('a');
  });
});

describe('toStockIndexItem', () => {
  it('istemci şemasına uyar; m her zaman sayıdır', () => {
    const item = toStockIndexItem({
      ticker: 'THYAO',
      companyName: 'TÜRK HAVA YOLLARI A.O.',
      stockType: 'stock',
      mentions: 3,
    });
    expect(item).toEqual({ t: 'THYAO', n: 'TÜRK HAVA YOLLARI A.O.', type: 'stock', m: 3 });
    expect(stockIndexSchema.safeParse([item]).success).toBe(true);
  });

  it('bilinmeyen tür other olur', () => {
    expect(
      toStockIndexItem({ ticker: 'X', companyName: 'X', stockType: 'fund', mentions: 0 }).type
    ).toBe('other');
  });
});

describe('toTagSuggestion', () => {
  it.each([
    [{ slug: 'bist100', tagName: '#bist100', count: 3 }, 'bist100'],
    [{ slug: 'temettu', tagName: '#Temettü', count: 1 }, 'Temettü'],
    // Katlanınca slug'a eşit değil → slug (öneri başka etikete gitmesin)
    [{ slug: 'temettu', tagName: '#kar', count: 1 }, 'temettu'],
    // Gövde karakteri dışı → slug
    [{ slug: 'halkaarz', tagName: '#halka arz', count: 1 }, 'halkaarz'],
  ])('%o → ad %s', (row, name) => {
    const tag = toTagSuggestion(row);
    expect(tag).toEqual({ slug: row.slug, name, count: row.count });
    expect(tagSuggestionsSchema.safeParse([tag]).success).toBe(true);
  });
});
