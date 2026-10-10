import { describe, expect, it } from 'vitest';

import { type MentionUser, toRichTextContent } from './resolve';

const USERS: MentionUser[] = [
  { userId: 1, username: 'aysek', displayName: 'Ayşe Kaya' },
  { userId: 2, username: 'yeni_ad', displayName: 'Ad Değiştiren' },
];

const stored = (items: unknown[]): unknown => ({ v: 1, items });

describe('toRichTextContent: düz metin (contentFormat 2)', () => {
  it('mention userId ile güncel ada çözülür, görünen metin aynı kalır', () => {
    const text = 'selam @eski_ad';
    const result = toRichTextContent(
      {
        content: text,
        contentFormat: 2,
        entities: stored([{ type: 'mention', start: 6, end: 14, username: 'eski_ad', userId: 2 }]),
      },
      { users: USERS }
    );
    expect(result).toEqual({
      text,
      entities: [
        { type: 'mention', start: 6, end: 14, username: 'yeni_ad', displayName: 'Ad Değiştiren' },
      ],
    });
  });

  it('çözülemeyen (silinmiş/askıdaki) kullanıcıya mention entity olmaz', () => {
    const result = toRichTextContent(
      {
        content: '@aysek',
        contentFormat: 2,
        entities: stored([{ type: 'mention', start: 0, end: 6, username: 'aysek', userId: 99 }]),
      },
      { users: USERS }
    );
    expect(result.entities).toEqual([]);
  });

  it('yazılan ad metinle uyuşmayan mention başkasına link vermez', () => {
    const result = toRichTextContent(
      {
        content: '@baska',
        contentFormat: 2,
        entities: stored([{ type: 'mention', start: 0, end: 6, username: 'aysek', userId: 1 }]),
      },
      { users: USERS }
    );
    expect(result.entities).toEqual([]);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['yanlış sürüm', { v: 2, items: [] }],
    ['items dizi değil', { v: 1, items: 'x' }],
    ['dizi', []],
    ['string', '{"v":1}'],
  ])('jsonb şekli geçersiz (%s) → entity yok, throw yok', (_label, entities) => {
    expect(toRichTextContent({ content: 'metin', contentFormat: 2, entities })).toEqual({
      text: 'metin',
      entities: [],
    });
  });

  it('geçersiz öğeler tek tek atlanır, geçerliler kalır', () => {
    const result = toRichTextContent({
      content: '#bist100',
      contentFormat: 2,
      entities: stored([
        { type: 'bogus', start: 0, end: 1 },
        { type: 'hashtag', start: '0', end: 8, slug: 'bist100' },
        { type: 'hashtag', start: -1, end: 8, slug: 'bist100' },
        null,
        { type: 'hashtag', start: 0, end: 8, slug: 'bist100', tagId: 3 },
      ]),
    });
    // Render'a gerekmeyen alanlar (tagId) taşınmaz
    expect(result.entities).toEqual([{ type: 'hashtag', start: 0, end: 8, slug: 'bist100' }]);
  });

  it('url href olduğu gibi taşınır; güvenlik kontrolü render aşamasında', () => {
    const result = toRichTextContent({
      content: 'javascript:alert(1)',
      contentFormat: 2,
      entities: stored([{ type: 'url', start: 0, end: 19, href: 'javascript:alert(1)' }]),
    });
    expect(result.entities).toHaveLength(1);
  });
});

describe('toRichTextContent: eski markup (contentFormat 1)', () => {
  it('$(THYAO) → $THYAO cashtag, #(x) → hashtag, @(ad) bilinen kullanıcıya mention', () => {
    const result = toRichTextContent(
      { content: '$(THYAO) #(bist100) @(aysek) @(yok_kisi)', contentFormat: 1, entities: null },
      { users: USERS }
    );
    expect(result.text).toBe('$THYAO #bist100 @aysek @yok_kisi');
    expect(result.entities).toEqual([
      { type: 'cashtag', start: 0, end: 6, ticker: 'THYAO' },
      { type: 'hashtag', start: 7, end: 15, slug: 'bist100' },
      { type: 'mention', start: 16, end: 22, username: 'aysek', displayName: 'Ayşe Kaya' },
    ]);
  });

  it('e-posta id’li eski mention e-postayı göstermez', () => {
    const result = toRichTextContent(
      { content: 'merhaba @(ali@ornek.com)', contentFormat: 1, entities: null },
      { users: USERS }
    );
    expect(result.text).not.toContain('ornek.com');
    expect(result.entities).toEqual([]);
  });
});
